from drf_spectacular.utils import extend_schema_field, inline_serializer
from rest_framework import serializers

from .models import Appointment
from .scheduling import cancellation_cutoff_for, cancellation_window_open


class PortalAppointmentSerializer(serializers.ModelSerializer):
    """Read-only appointment view tailored for the patient portal.

    Strips clinician-only fields (``created_by``, ``created_by_name``,
    rendering provider FK/role/title PII) and exposes a single
    provider display string plus appointment metadata the patient cares
    about: when, where, what for, and current status.
    """

    facility_name = serializers.CharField(source="facility.name", read_only=True)
    facility_timezone = serializers.SerializerMethodField()
    status_name = serializers.CharField(source="status.name", read_only=True)
    status_code = serializers.CharField(source="status.code", read_only=True)
    appointment_type_name = serializers.CharField(
        source="appointment_type.name",
        read_only=True,
    )
    appointment_type_code = serializers.CharField(
        source="appointment_type.code",
        read_only=True,
    )
    provider_display_name = serializers.SerializerMethodField()
    duration_minutes = serializers.SerializerMethodField()
    cancel_eligibility = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            "id",
            "appointment_time",
            "end_time",
            "duration_minutes",
            "facility_name",
            "facility_timezone",
            "status_name",
            "status_code",
            "appointment_type_name",
            "appointment_type_code",
            "provider_display_name",
            "room",
            "reason",
            "cancel_eligibility",
        ]
        read_only_fields = fields

    @extend_schema_field(serializers.CharField())
    def get_provider_display_name(self, obj):
        return obj.rendering_provider_name or ""

    @extend_schema_field(serializers.IntegerField())
    def get_duration_minutes(self, obj):
        return obj.duration_minutes

    @extend_schema_field(serializers.CharField())
    def get_facility_timezone(self, obj):
        tz = getattr(obj.facility, "timezone", None)
        return str(tz) if tz else ""

    @extend_schema_field(
        inline_serializer(
            name="CancelEligibility",
            fields={
                "can_cancel": serializers.BooleanField(),
                "cutoff_hours": serializers.IntegerField(),
            },
        )
    )
    def get_cancel_eligibility(self, obj):
        return {
            "can_cancel": cancellation_window_open(obj),
            "cutoff_hours": cancellation_cutoff_for(obj),
        }
