from rest_framework import serializers
from .models import Appointment


class AppointmentSerializer(serializers.ModelSerializer):
    status_name = serializers.CharField(source="status.name", read_only=True)
    status_code = serializers.CharField(source="status.code", read_only=True)
    status_color = serializers.CharField(source="status.color", read_only=True)

    appointment_type_name = serializers.CharField(source="appointment_type.name", read_only=True)
    appointment_type_code = serializers.CharField(source="appointment_type.code", read_only=True)
    appointment_type_color = serializers.CharField(source="appointment_type.color", read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "patient_name",
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
        ]
        read_only_fields = ("created_by", "created_by_name", "created_at")