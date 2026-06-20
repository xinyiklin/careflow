"""Optimistic edit-presence (soft lock) for appointments.

Extracted from the viewset into a mixin so the edit-session concern — who is
currently editing an appointment, heartbeats, and release — stays isolated
from CRUD. Mixed into ``AppointmentViewSet``; the ``@action`` is still
discovered by the router via inheritance.
"""

from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status as drf_status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from facilities.security import user_has_facility_permission

from .models import Appointment, AppointmentEditSession
from .services import get_user_display_name


class EditSessionActiveEditorSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(allow_null=True)
    user_name = serializers.CharField()
    started_at = serializers.DateTimeField()
    last_seen_at = serializers.DateTimeField()


class EditSessionRequestSerializer(serializers.Serializer):
    """Documents the edit-session body (POST acquire, PATCH heartbeat; both
    accept ``override`` to take over an idle holder). Schema-only — the action
    reads ``override`` directly from ``request.data``."""

    override = serializers.BooleanField(required=False, default=False)


class EditSessionResponseSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=["available", "active", "occupied", "released"]
    )
    can_override = serializers.BooleanField(required=False)
    active_editor = EditSessionActiveEditorSerializer(allow_null=True, required=False)


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

    @staticmethod
    def _override_requested(request):
        # The body carries a JSON boolean; accept common truthy encodings too.
        return request.data.get("override") in (True, "true", "True", 1, "1")

    @extend_schema(
        methods=["GET"],
        request=None,
        responses={200: EditSessionResponseSerializer},
        description="Check who currently holds the appointment edit-session.",
    )
    @extend_schema(
        methods=["POST", "PATCH"],
        request=EditSessionRequestSerializer,
        responses={200: EditSessionResponseSerializer},
        description=(
            "Acquire (POST) or heartbeat (PATCH) the appointment edit-session; "
            "send override=true to take over an idle holder."
        ),
    )
    @extend_schema(
        methods=["DELETE"],
        request=None,
        responses={200: EditSessionResponseSerializer},
        description="Release the appointment edit-session held by the current user.",
    )
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

            # Another user's still-active session can be taken over once its
            # holder has been idle past the override threshold.
            can_override = bool(
                active_editor
                and not is_current_user
                and active_editor.is_idle_for_override(now)
            )
            override_requested = self._override_requested(request)
            may_take_over = bool(override_requested and can_override)

            def occupied_response(editor):
                return Response(
                    {
                        "status": "occupied",
                        "can_override": can_override,
                        "active_editor": self._serialize_edit_session(editor),
                    }
                )

            def active_response(active_session):
                return Response(
                    {
                        "status": "active",
                        "can_override": False,
                        "active_editor": self._serialize_edit_session(active_session),
                    }
                )

            if request.method == "GET":
                if active_editor and not is_current_user:
                    return occupied_response(active_editor)

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
                    return active_response(session)

                if active_editor and not may_take_over:
                    return occupied_response(active_editor)

                if active_editor:
                    # idle holder being taken over (override).
                    session = self._set_current_edit_session(locked_appointment)
                    return active_response(session)

                # PATCH is a heartbeat, not an acquire: a non-holder with no
                # active session to refresh gets a no-op rather than a new lease.
                return Response(
                    {
                        "status": "available",
                        "can_override": False,
                        "active_editor": None,
                    }
                )

            # POST: acquire, refresh own lease, or take over an idle holder.
            if active_editor and not is_current_user and not may_take_over:
                return occupied_response(active_editor)

            session = self._set_current_edit_session(locked_appointment)
            return active_response(session)
