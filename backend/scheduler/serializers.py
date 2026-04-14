from rest_framework import serializers

from .models import Appointment


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    patient_id = serializers.IntegerField(source="patient.id", read_only=True)
    patient_date_of_birth = serializers.DateField(
        source="patient.date_of_birth", read_only=True
    )
    patient_chart_number = serializers.CharField(
        source="patient.chart_number", read_only=True
    )

    status_name = serializers.CharField(source="status.name", read_only=True)
    status_code = serializers.CharField(source="status.code", read_only=True)
    status_color = serializers.CharField(source="status.color", read_only=True)

    appointment_type_name = serializers.CharField(
        source="appointment_type.name", read_only=True
    )
    appointment_type_code = serializers.CharField(
        source="appointment_type.code", read_only=True
    )
    appointment_type_color = serializers.CharField(
        source="appointment_type.color", read_only=True
    )

    allow_same_day_double_book = serializers.BooleanField(
        write_only=True, required=False, default=False
    )

    class Meta:
        model = Appointment
        fields = [
            "id",
            "patient",
            "patient_id",
            "patient_name",
            "patient_date_of_birth",
            "patient_chart_number",
            "doctor_name",
            "appointment_time",
            "reason",
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
        read_only_fields = ("created_by", "created_by_name", "created_at")

    def get_patient_name(self, obj):
        return f"{obj.patient.last_name}, {obj.patient.first_name}"

    def validate(self, attrs):
        patient = attrs.get("patient", getattr(self.instance, "patient", None))
        appointment_time = attrs.get(
            "appointment_time", getattr(self.instance, "appointment_time", None)
        )
        facility = attrs.get("facility", getattr(self.instance, "facility", None))
        allow_same_day_double_book = attrs.pop("allow_same_day_double_book", False)

        if not patient or not appointment_time or not facility:
            return attrs

        appointment_date = appointment_time.date()

        existing_appointments = Appointment.objects.filter(
            patient=patient,
            facility=facility,
            appointment_time__date=appointment_date,
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
