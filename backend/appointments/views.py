from datetime import datetime, timedelta, timezone as dt_timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.db import transaction
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import permissions, status as drf_status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from audit.models import AuditEvent
from clinical.models import Encounter, ProgressNote
from facilities.security import user_has_facility_permission
from patients.models import Patient
from shared.scoping import FacilityScopedViewSetMixin

from .models import Appointment, AppointmentEditSession
from .serializers import AppointmentSerializer


def get_facility_timezone(facility):
    tz_name = str(getattr(facility, "timezone", "") or "")
    if not tz_name:
        raise ValidationError({"facility": "Facility timezone is not configured."})

    try:
        return ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        raise ValidationError({"facility": f"Invalid facility timezone: {tz_name}."})


def get_user_display_name(user):
    if not user:
        return "Unknown user"
    return user.get_full_name() or user.username or "Unknown user"


def get_changed_field_labels(instance, validated_data):
    field_labels = {
        "patient": "Patient",
        "resource": "Resource",
        "rendering_provider": "Rendering provider",
        "appointment_time": "Appointment time",
        "reason": "Reason",
        "notes": "Notes",
        "status": "Status",
        "appointment_type": "Visit type",
        "facility": "Facility",
    }
    changed = []

    for field_name, label in field_labels.items():
        if field_name not in validated_data:
            continue

        previous_value = getattr(instance, field_name)
        next_value = validated_data[field_name]

        if hasattr(previous_value, "pk"):
            previous_value = previous_value.pk
        if hasattr(next_value, "pk"):
            next_value = next_value.pk

        if previous_value != next_value:
            changed.append(label)

    return changed


def build_audit_history_item(event):
    metadata = event.metadata or {}
    actor = event.actor

    return {
        "id": f"audit-{event.id}",
        "action": event.action,
        "summary": event.summary,
        "actor_name": (
            get_user_display_name(actor)
            if actor
            else metadata.get("actor_name", "Unknown user")
        ),
        "created_at": event.created_at,
        "changed_fields": metadata.get("changed_fields", []),
        "metadata": metadata,
    }


class AppointmentViewSet(FacilityScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["facility"] = self.get_facility()
        return context

    def get_queryset(self):
        facility = self.get_facility()
        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            "schedule.view",
        ):
            raise PermissionDenied("You do not have access to view appointments.")

        queryset = (
            Appointment.objects.filter(facility=facility)
            .select_related(
                "patient",
                "status",
                "appointment_type",
                "resource",
                "rendering_provider__user",
                "rendering_provider__role",
                "rendering_provider__title",
                "facility",
                "created_by",
            )
            .order_by("appointment_time")
        )

        date_str = self.request.query_params.get("date")
        date_to_str = self.request.query_params.get("date_to")
        patient_id = self.request.query_params.get("patient_id")

        if date_to_str and not date_str:
            raise ValidationError(
                {"date_to": "date_to can only be used with a start date."}
            )

        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)

        if date_str:
            try:
                selected_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                end_date = selected_date
                if date_to_str:
                    parsed_end_date = datetime.strptime(date_to_str, "%Y-%m-%d").date()
                    if parsed_end_date < selected_date:
                        raise ValidationError(
                            {"date_to": "date_to must be on or after date."}
                        )
                    end_date = parsed_end_date

                facility_tz = get_facility_timezone(facility)

                local_start = datetime.combine(selected_date, datetime.min.time())
                local_end = datetime.combine(
                    end_date + timedelta(days=1),
                    datetime.min.time(),
                )

                utc_start = timezone.make_aware(local_start, facility_tz).astimezone(
                    dt_timezone.utc
                )
                utc_end = timezone.make_aware(local_end, facility_tz).astimezone(
                    dt_timezone.utc
                )

                queryset = queryset.filter(
                    appointment_time__gte=utc_start,
                    appointment_time__lt=utc_end,
                )
            except ValueError:
                raise ValidationError({"date": "Use YYYY-MM-DD for date and date_to."})

        return queryset

    def create(self, request, *args, **kwargs):
        facility = self.get_facility()
        patient_id = request.data.get("patient")
        with transaction.atomic():
            if patient_id:
                Patient.objects.select_for_update().filter(
                    pk=patient_id,
                    facility=facility,
                    is_active=True,
                ).first()
            return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        with transaction.atomic():
            appointment = self.get_object()
            Patient.objects.select_for_update().filter(
                pk=appointment.patient_id,
                facility=appointment.facility,
                is_active=True,
            ).first()
            return super().update(request, *args, **kwargs)

    @action(detail=False, methods=["get"], url_path="heatmap")
    def heatmap(self, request):
        facility = self.get_facility()
        if not user_has_facility_permission(
            request.user,
            facility.id,
            "schedule.view",
        ):
            raise PermissionDenied("You do not have access to view appointments.")

        month_str = request.query_params.get("month")
        if not month_str:
            raise ValidationError({"month": "Use YYYY-MM for month."})

        try:
            month_start_date = datetime.strptime(month_str, "%Y-%m").date()
        except ValueError:
            raise ValidationError({"month": "Use YYYY-MM for month."})

        facility_tz = get_facility_timezone(facility)
        next_month = (
            month_start_date.replace(year=month_start_date.year + 1, month=1)
            if month_start_date.month == 12
            else month_start_date.replace(month=month_start_date.month + 1)
        )

        local_start = datetime.combine(month_start_date, datetime.min.time())
        local_end = datetime.combine(next_month, datetime.min.time())
        utc_start = timezone.make_aware(local_start, facility_tz).astimezone(
            dt_timezone.utc
        )
        utc_end = timezone.make_aware(local_end, facility_tz).astimezone(
            dt_timezone.utc
        )

        rows = (
            Appointment.objects.filter(
                facility=facility,
                appointment_time__gte=utc_start,
                appointment_time__lt=utc_end,
            )
            .annotate(local_date=TruncDate("appointment_time", tzinfo=facility_tz))
            .values("local_date")
            .annotate(count=Count("id"))
            .order_by("local_date")
        )

        return Response(
            {
                "month": month_str,
                "counts": {
                    row["local_date"].isoformat(): row["count"]
                    for row in rows
                    if row["local_date"]
                },
            }
        )

    def _create_audit_event(self, *, appointment, action, summary, metadata=None):
        AuditEvent.objects.create(
            actor=self.request.user,
            facility=appointment.facility,
            patient=appointment.patient,
            action=action,
            app_label="appointments",
            model_name="appointment",
            object_pk=str(appointment.pk),
            summary=summary,
            metadata=metadata or {},
        )

    def perform_create(self, serializer):
        profile = self.get_staff_profile()
        facility = serializer.validated_data.get("facility") or profile.facility
        patient = serializer.validated_data.get("patient")
        status = serializer.validated_data.get("status")
        appointment_type = serializer.validated_data.get("appointment_type")
        resource = serializer.validated_data.get("resource")
        rendering_provider = serializer.validated_data.get("rendering_provider")

        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            "schedule.create",
        ):
            raise PermissionDenied("You do not have access to create appointments.")

        if facility.id != profile.facility.id:
            raise PermissionDenied("You do not have access to this facility.")

        if patient.facility_id != facility.id:
            raise PermissionDenied("Selected patient does not belong to this facility.")

        if status.facility_id != facility.id:
            raise PermissionDenied("Selected status does not belong to this facility.")

        if appointment_type.facility_id != facility.id:
            raise PermissionDenied(
                "Selected appointment type does not belong to this facility."
            )

        if resource and resource.facility_id != facility.id:
            raise PermissionDenied(
                "Selected resource does not belong to this facility."
            )

        if rendering_provider and rendering_provider.facility_id != facility.id:
            raise PermissionDenied(
                "Selected rendering provider does not belong to this facility."
            )

        appointment = serializer.save(created_by=self.request.user)
        self._create_audit_event(
            appointment=appointment,
            action="create",
            summary=f"Created appointment for {appointment.patient.last_name}, {appointment.patient.first_name}",
            metadata={
                "actor_name": get_user_display_name(self.request.user),
                "appointment_time": appointment.appointment_time.isoformat(),
            },
        )

        if appointment.is_effectively_billable:
            encounter = Encounter.objects.create(
                patient=appointment.patient,
                facility=appointment.facility,
                appointment=appointment,
                rendering_provider=appointment.rendering_provider,
                reason=appointment.reason,
                started_at=appointment.appointment_time,
                created_by=self.request.user,
            )
            ProgressNote.objects.create(
                encounter=encounter,
                created_by=self.request.user,
            )

    def perform_update(self, serializer):
        profile = self.get_staff_profile()
        changed_fields = get_changed_field_labels(
            serializer.instance,
            serializer.validated_data,
        )

        facility = serializer.validated_data.get(
            "facility",
            serializer.instance.facility,
        )
        patient = serializer.validated_data.get(
            "patient",
            serializer.instance.patient,
        )
        status = serializer.validated_data.get(
            "status",
            serializer.instance.status,
        )
        appointment_type = serializer.validated_data.get(
            "appointment_type",
            serializer.instance.appointment_type,
        )
        resource = serializer.validated_data.get(
            "resource",
            serializer.instance.resource,
        )
        rendering_provider = serializer.validated_data.get(
            "rendering_provider",
            serializer.instance.rendering_provider,
        )

        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            "schedule.update",
        ):
            raise PermissionDenied("You do not have access to update appointments.")

        if facility.id != profile.facility.id:
            raise PermissionDenied("You do not have access to this facility.")

        if patient.facility_id != facility.id:
            raise PermissionDenied("Selected patient does not belong to this facility.")

        if status.facility_id != facility.id:
            raise PermissionDenied("Selected status does not belong to this facility.")

        if appointment_type.facility_id != facility.id:
            raise PermissionDenied(
                "Selected appointment type does not belong to this facility."
            )

        if resource and resource.facility_id != facility.id:
            raise PermissionDenied(
                "Selected resource does not belong to this facility."
            )

        if rendering_provider and rendering_provider.facility_id != facility.id:
            raise PermissionDenied(
                "Selected rendering provider does not belong to this facility."
            )

        appointment = serializer.save()
        self._create_audit_event(
            appointment=appointment,
            action="update",
            summary="Updated appointment details",
            metadata={
                "actor_name": get_user_display_name(self.request.user),
                "changed_fields": changed_fields,
            },
        )

        if (
            appointment.is_effectively_billable
            and not Encounter.objects.filter(appointment=appointment).exists()
        ):
            encounter = Encounter.objects.create(
                patient=appointment.patient,
                facility=appointment.facility,
                appointment=appointment,
                rendering_provider=appointment.rendering_provider,
                reason=appointment.reason,
                started_at=appointment.appointment_time,
                created_by=self.request.user,
            )
            ProgressNote.objects.create(
                encounter=encounter,
                created_by=self.request.user,
            )

    def perform_destroy(self, instance):
        profile = self.get_staff_profile()

        if instance.facility_id != profile.facility.id:
            raise PermissionDenied("You do not have access to this facility.")

        if not user_has_facility_permission(
            self.request.user,
            profile.facility.id,
            "schedule.delete",
        ):
            raise PermissionDenied("You do not have access to delete appointments.")

        self._create_audit_event(
            appointment=instance,
            action="delete",
            summary="Deleted appointment",
            metadata={
                "actor_name": get_user_display_name(self.request.user),
            },
        )
        instance.delete()

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

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        appointment = self.get_object()
        events = (
            AuditEvent.objects.filter(
                app_label="appointments",
                model_name="appointment",
                object_pk=str(appointment.pk),
            )
            .select_related("actor")
            .order_by("-created_at")
        )

        items = [build_audit_history_item(event) for event in events]

        if (
            not any(item["action"] == "create" for item in items)
            and appointment.created_at
        ):
            items.append(
                {
                    "id": f"appointment-created-{appointment.pk}",
                    "action": "create",
                    "summary": f"Created appointment for {appointment.patient.last_name}, {appointment.patient.first_name}",
                    "actor_name": appointment.created_by_name or "Unknown user",
                    "created_at": appointment.created_at,
                    "changed_fields": [],
                    "metadata": {
                        "source": "appointment_record",
                    },
                }
            )
            items.sort(key=lambda item: item["created_at"], reverse=True)

        return Response(items)
