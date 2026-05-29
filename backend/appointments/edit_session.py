"""Optimistic edit-presence (soft lock) for appointments.

Extracted from the viewset into a mixin so the edit-session concern — who is
currently editing an appointment, heartbeats, and release — stays isolated
from CRUD. Mixed into ``AppointmentViewSet``; the ``@action`` is still
discovered by the router via inheritance.
"""

from django.db import transaction
from django.utils import timezone
from rest_framework import status as drf_status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from facilities.security import user_has_facility_permission

from .models import Appointment, AppointmentEditSession
from .services import get_user_display_name


class AppointmentEditSessionMixin:
    """Adds the ``edit-session`` action (and its helpers) to a viewset."""

    def _require_update_permission(self, appointment):
        if not user_has_facility_permission(
            self.request.user,
            appointment.facility_id,
            "schedule.update",
        ):
            raise PermissionDenied("You do not have access to update appointments.")

    def _serialize_edit_session(self, session):
        if not session:
            return None

        return {
            "user_id": session.user_id,
            "user_name": session.user_display_name or "Unknown user",
            "started_at": session.started_at,
            "last_seen_at": session.last_seen_at,
        }

    def _set_current_edit_session(self, appointment):
        session, _created = AppointmentEditSession.objects.update_or_create(
            appointment=appointment,
            defaults={
                "user": self.request.user,
                "user_display_name": get_user_display_name(self.request.user),
                "last_seen_at": timezone.now(),
            },
        )
        return session

    @action(
        detail=True,
        methods=["get", "post", "patch", "delete"],
        url_path="edit-session",
    )
    def edit_session(self, request, pk=None):
        appointment = self.get_object()
        self._require_update_permission(appointment)

        with transaction.atomic():
            locked_appointment = (
                Appointment.objects.select_for_update()
                .filter(pk=appointment.pk, facility=appointment.facility)
                .first()
            )
            if not locked_appointment:
                raise ValidationError({"appointment": "Appointment was not found."})

            session = (
                AppointmentEditSession.objects.select_for_update()
                .filter(appointment=locked_appointment)
                .first()
            )
            now = timezone.now()
            is_active = bool(session and session.is_active(now))
            is_current_user = bool(session and session.user_id == request.user.id)
            active_editor = session if is_active else None

            if session and not is_active:
                session.delete()
                session = None
                is_current_user = False

            if request.method == "GET":
                if active_editor and not is_current_user:
                    return Response(
                        {
                            "status": "occupied",
                            "can_override": False,
                            "active_editor": self._serialize_edit_session(
                                active_editor
                            ),
                        }
                    )

                return Response(
                    {
                        "status": "active" if is_current_user else "available",
                        "can_override": False,
                        "active_editor": self._serialize_edit_session(session),
                    }
                )

            if request.method == "DELETE":
                if is_current_user and session:
                    session.delete()
                return Response({"status": "released"}, status=drf_status.HTTP_200_OK)

            if request.method == "PATCH":
                if is_current_user and session:
                    session.last_seen_at = now
                    session.save(update_fields=["last_seen_at"])
                    return Response(
                        {
                            "status": "active",
                            "can_override": False,
                            "active_editor": self._serialize_edit_session(session),
                        }
                    )

                if active_editor:
                    return Response(
                        {
                            "status": "occupied",
                            "can_override": False,
                            "active_editor": self._serialize_edit_session(
                                active_editor
                            ),
                        }
                    )

                session = self._set_current_edit_session(locked_appointment)
                return Response(
                    {
                        "status": "active",
                        "can_override": False,
                        "active_editor": self._serialize_edit_session(session),
                    }
                )

            if active_editor and not is_current_user:
                return Response(
                    {
                        "status": "occupied",
                        "can_override": False,
                        "active_editor": self._serialize_edit_session(active_editor),
                    }
                )

            session = self._set_current_edit_session(locked_appointment)
            return Response(
                {
                    "status": "active",
                    "can_override": False,
                    "active_editor": self._serialize_edit_session(session),
                }
            )
