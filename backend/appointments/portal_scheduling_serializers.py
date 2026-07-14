"""Portal serializers for the online-scheduling flow.

All responses are stripped of clinician PII and audit fields; the
patient only sees what's relevant to picking and booking a slot.
"""

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from appointments.scheduling import (
    cancellation_cutoff_for,
    cancellation_window_open,
    slot_auto_confirms,
)

from .models import Appointment, BookableSlot


class PortalSchedulingProviderSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    display_name = serializers.CharField()
    specialty = serializers.CharField(allow_blank=True)


class PortalSchedulingAppointmentTypeSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    code = serializers.CharField()
    name = serializers.CharField()
    duration_minutes = serializers.IntegerField()


class PortalSchedulingSlotSerializer(serializers.ModelSerializer):
    auto_confirms = serializers.SerializerMethodField()

    class Meta:
        model = BookableSlot
        fields = [
            "id",
            "start_time",
            "end_time",
            "auto_confirms",
        ]
        read_only_fields = fields

    @extend_schema_field(serializers.BooleanField())
    def get_auto_confirms(self, obj):
        return slot_auto_confirms(obj)


class PortalBookingRequestSerializer(serializers.Serializer):
    """Payload for ``POST /v1/portal/scheduling/book/``."""

    slot_id = serializers.IntegerField()
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500)


class PortalCancelEligibilitySerializer(serializers.Serializer):
    can_cancel = serializers.BooleanField()
    cutoff_hours = serializers.IntegerField()


class PortalAppointmentBookingResponseSerializer(serializers.ModelSerializer):
    """Returned from the booking endpoint and the cancel eligibility check."""

    facility_name = serializers.CharField(source="facility.name", read_only=True)
    facility_timezone = serializers.SerializerMethodField()
    status_name = serializers.CharField(source="status.name", read_only=True)
    status_code = serializers.CharField(source="status.code", read_only=True)
    appointment_type_name = serializers.CharField(
        source="appointment_type.name", read_only=True
    )
    provider_display_name = serializers.SerializerMethodField()
    cancel_eligibility = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            "id",
            "appointment_time",
            "end_time",
            "facility_name",
            "facility_timezone",
            "status_name",
            "status_code",
            "appointment_type_name",
            "provider_display_name",
            "reason",
            "cancel_eligibility",
        ]
        read_only_fields = fields

    def get_facility_timezone(self, obj):
        tz = getattr(obj.facility, "timezone", None)
        return str(tz) if tz else ""

    def get_provider_display_name(self, obj):
        return obj.rendering_provider_name or ""

    @extend_schema_field(PortalCancelEligibilitySerializer())
    def get_cancel_eligibility(self, obj):
        return {
            "can_cancel": cancellation_window_open(obj),
            "cutoff_hours": cancellation_cutoff_for(obj),
        }
