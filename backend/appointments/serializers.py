from datetime import datetime, timedelta, timezone as dt_timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.utils import timezone
from rest_framework import serializers

from .models import Appointment

FACILITY_DATETIME_INPUT_FORMATS = (
    "%Y-%m-%dT%H:%M",
    "%Y-%m-%dT%H:%M:%S",
)


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    patient_id = serializers.IntegerField(source="patient.id", read_only=True)
    patient_first_name = serializers.CharField(
        source="patient.first_name",
        read_only=True,
    )
    patient_middle_name = serializers.CharField(
        source="patient.middle_name",
        read_only=True,
    )
    patient_last_name = serializers.CharField(
        source="patient.last_name",
        read_only=True,
    )
    patient_preferred_name = serializers.CharField(
        source="patient.preferred_name",
        read_only=True,
    )
    patient_date_of_birth = serializers.DateField(
        source="patient.date_of_birth",
        read_only=True,
    )
    patient_chart_number = serializers.CharField(
        source="patient.chart_number",
        read_only=True,
    )

    status_name = serializers.CharField(source="status.name", read_only=True)
    status_code = serializers.CharField(source="status.code", read_only=True)
    status_color = serializers.CharField(source="status.color", read_only=True)

    appointment_type_name = serializers.CharField(
        source="appointment_type.name",
        read_only=True,
    )
    appointment_type_code = serializers.CharField(
        source="appointment_type.code",
        read_only=True,
    )
    appointment_type_color = serializers.CharField(
        source="appointment_type.color",
        read_only=True,
    )
    resource_name = serializers.CharField(source="resource.name", read_only=True)
    rendering_provider_name = serializers.SerializerMethodField()
    rendering_provider_role_name = serializers.SerializerMethodField()
    rendering_provider_title_name = serializers.SerializerMethodField()

    duration_minutes = serializers.SerializerMethodField()
    end_time = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    allow_same_day_double_book = serializers.BooleanField(
        write_only=True,
        required=False,
        default=False,
    )

    class Meta:
        model = Appointment
        fields = [
            "id",
            "patient",
            "patient_id",
            "patient_name",
            "patient_first_name",
            "patient_middle_name",
            "patient_last_name",
            "patient_preferred_name",
            "patient_date_of_birth",
            "patient_chart_number",
            "resource",
            "resource_name",
            "rendering_provider",
            "rendering_provider_name",
            "rendering_provider_role_name",
            "rendering_provider_title_name",
            "appointment_time",
            "end_time",
            "duration_minutes",
            "room",
            "reason",
            "notes",
            "status",
            "status_name",
            "status_code",
            "status_color",
            "appointment_type",
            "appointment_type_name",
            "appointment_type_code",
            "appointment_type_color",
            "facility",
            "created_by",
            "created_by_name",
            "created_at",
            "allow_same_day_double_book",
        ]
        read_only_fields = (
            "created_by",
            "created_by_name",
            "created_at",
        )
        extra_kwargs = {
            "facility": {"required": False},
        }

    def get_patient_name(self, obj):
        return f"{obj.patient.last_name}, {obj.patient.first_name}"

    def get_rendering_provider_name(self, obj):
        if obj.rendering_provider_name:
            return obj.rendering_provider_name
        return ""

    def get_rendering_provider_role_name(self, obj):
        return getattr(getattr(obj.rendering_provider, "role", None), "name", "") or ""

    def get_rendering_provider_title_name(self, obj):
        return getattr(getattr(obj.rendering_provider, "title", None), "name", "") or ""

    def _get_facility(self, attrs):
        if "facility" in attrs:
            return attrs["facility"]
        if self.instance:
            return self.instance.facility
        return self.context.get("facility")

    def _get_facility_tz(self, facility):
        tz_name = str(getattr(facility, "timezone", "") or "")
        if not tz_name:
            raise serializers.ValidationError(
                {"facility": "Facility timezone is not configured."}
            )

        try:
            return ZoneInfo(tz_name)
        except ZoneInfoNotFoundError:
            raise serializers.ValidationError(
                {"facility": f"Invalid facility timezone: {tz_name}."}
            )

    def _parse_facility_local_datetime_to_utc(
        self,
        raw_value,
        facility,
        field_name="appointment_time",
    ):
        if raw_value in (None, ""):
            return None

        facility_tz = self._get_facility_tz(facility)

        if isinstance(raw_value, datetime):
            parsed = raw_value
        elif isinstance(raw_value, str):
            parsed = None
            for fmt in FACILITY_DATETIME_INPUT_FORMATS:
                try:
                    parsed = datetime.strptime(raw_value, fmt)
                    break
                except ValueError:
                    continue
            if parsed is None:
                raise serializers.ValidationError(
                    {field_name: "Invalid datetime format. Use YYYY-MM-DDTHH:MM."}
                )
        else:
            raise serializers.ValidationError({field_name: "Invalid datetime value."})

        if timezone.is_aware(parsed):
            local_dt = parsed.astimezone(facility_tz)
        else:
            local_dt = timezone.make_aware(parsed, facility_tz)

        return local_dt.astimezone(dt_timezone.utc)

    def _format_utc_to_facility_local(self, value, facility):
        if not value:
            return None
        facility_tz = self._get_facility_tz(facility)
        local_dt = timezone.localtime(value, facility_tz)
        return local_dt.strftime("%Y-%m-%dT%H:%M")

    def validate(self, attrs):
        facility = self._get_facility(attrs)
        patient = attrs.get("patient", getattr(self.instance, "patient", None))
        appointment_type = attrs.get(
            "appointment_type",
            getattr(self.instance, "appointment_type", None),
        )
        allow_same_day_double_book = attrs.pop("allow_same_day_double_book", False)

        if facility is not None and not self.instance and "facility" not in attrs:
            attrs["facility"] = facility

        raw_appointment_time = self.initial_data.get("appointment_time")
        if raw_appointment_time is not None and facility is not None:
            attrs["appointment_time"] = self._parse_facility_local_datetime_to_utc(
                raw_appointment_time,
                facility,
            )
        raw_end_time = self.initial_data.get("end_time", serializers.empty)
        if raw_end_time is not serializers.empty and facility is not None:
            if raw_end_time in (None, ""):
                attrs["end_time"] = None
            else:
                attrs["end_time"] = self._parse_facility_local_datetime_to_utc(
                    raw_end_time,
                    facility,
                    "end_time",
                )

        appointment_time = attrs.get(
            "appointment_time",
            getattr(self.instance, "appointment_time", None),
        )
        end_time = attrs.get("end_time", getattr(self.instance, "end_time", None))
        resource = attrs.get("resource", getattr(self.instance, "resource", None))
        room = attrs.get("room", getattr(self.instance, "room", ""))
        rendering_provider = attrs.get(
            "rendering_provider",
            getattr(self.instance, "rendering_provider", None),
        )

        if facility and resource and resource.facility_id != facility.id:
            raise serializers.ValidationError(
                {"resource": "Selected resource must belong to the same facility."}
            )

        if resource and not str(room or "").strip():
            attrs["room"] = getattr(resource, "default_room", "") or ""

        if appointment_time and not end_time and appointment_type:
            attrs["end_time"] = appointment_time + timedelta(
                minutes=appointment_type.duration_minutes
            )
            end_time = attrs["end_time"]

        if appointment_time and end_time and end_time <= appointment_time:
            raise serializers.ValidationError(
                {"end_time": "Appointment end time must be after start time."}
            )

        if facility and rendering_provider:
            if rendering_provider.facility_id != facility.id:
                raise serializers.ValidationError(
                    {
                        "rendering_provider": (
                            "Rendering provider must belong to the same facility."
                        )
                    }
                )
            if not rendering_provider.is_active:
                raise serializers.ValidationError(
                    {"rendering_provider": "Rendering provider must be active."}
                )

        if not patient or not appointment_time or not facility:
            return attrs

        facility_tz = self._get_facility_tz(facility)
        appointment_date_local = timezone.localtime(
            appointment_time,
            facility_tz,
        ).date()

        local_start = datetime.combine(appointment_date_local, datetime.min.time())
        local_end = datetime.combine(
            appointment_date_local + timedelta(days=1),
            datetime.min.time(),
        )
        utc_start = timezone.make_aware(local_start, facility_tz).astimezone(
            dt_timezone.utc
        )
        utc_end = timezone.make_aware(local_end, facility_tz).astimezone(
            dt_timezone.utc
        )

        existing_appointments = Appointment.objects.filter(
            patient=patient,
            facility=facility,
            appointment_time__gte=utc_start,
            appointment_time__lt=utc_end,
        )

        if self.instance:
            existing_appointments = existing_appointments.exclude(id=self.instance.id)

        if existing_appointments.exists() and not allow_same_day_double_book:
            raise serializers.ValidationError(
                {
                    "duplicate_day_appointment": (
                        "This patient already has an appointment on this date."
                    )
                }
            )

        return attrs

    def get_duration_minutes(self, obj):
        return obj.duration_minutes

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["appointment_time"] = self._format_utc_to_facility_local(
            instance.appointment_time,
            instance.facility,
        )
        data["end_time"] = self._format_utc_to_facility_local(
            instance.end_time,
            instance.facility,
        )
        return data
