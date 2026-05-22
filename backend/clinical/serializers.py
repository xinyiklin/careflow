from django.utils import timezone
from rest_framework import serializers

from .models import Encounter, ProgressNote


class ProgressNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgressNote
        fields = [
            "id",
            "encounter",
            "status",
            "subjective",
            "objective",
            "assessment",
            "plan",
            "created_by",
            "signed_by",
            "signed_by_name",
            "signed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "encounter",
            "status",
            "created_by",
            "signed_by",
            "signed_by_name",
            "signed_at",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        if self.instance and self.instance.status == ProgressNote.STATUS_SIGNED:
            raise serializers.ValidationError(
                {"status": "Signed progress notes cannot be edited."}
            )
        return attrs

    def validate_subjective(self, value):
        return (value or "").strip()

    def validate_objective(self, value):
        return (value or "").strip()

    def validate_assessment(self, value):
        return (value or "").strip()

    def validate_plan(self, value):
        return (value or "").strip()


class EncounterSerializer(serializers.ModelSerializer):
    progress_note = ProgressNoteSerializer(required=False)
    patient_name = serializers.SerializerMethodField()
    patient_chart_number = serializers.CharField(
        source="patient.chart_number",
        read_only=True,
    )
    appointment_time = serializers.DateTimeField(
        source="appointment.appointment_time",
        read_only=True,
    )
    appointment_type_name = serializers.CharField(
        source="appointment.appointment_type.name",
        read_only=True,
    )
    rendering_provider_name = serializers.CharField(read_only=True)

    class Meta:
        model = Encounter
        fields = [
            "id",
            "patient",
            "patient_name",
            "patient_chart_number",
            "facility",
            "appointment",
            "appointment_time",
            "appointment_type_name",
            "rendering_provider",
            "rendering_provider_name",
            "status",
            "reason",
            "started_at",
            "ended_at",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
            "progress_note",
        ]
        read_only_fields = [
            "id",
            "facility",
            "patient_name",
            "patient_chart_number",
            "appointment_time",
            "appointment_type_name",
            "rendering_provider_name",
            "status",
            "ended_at",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]

    def get_patient_name(self, obj):
        return f"{obj.patient.last_name}, {obj.patient.first_name}"

    def _get_facility(self):
        return self.context.get("facility")

    def validate_patient(self, value):
        facility = self._get_facility()
        if not facility or value.facility_id != facility.id or not value.is_active:
            raise serializers.ValidationError(
                "Selected patient does not belong to this facility."
            )
        return value

    def validate_appointment(self, value):
        if not value:
            return value

        facility = self._get_facility()
        if not facility or value.facility_id != facility.id:
            raise serializers.ValidationError(
                "Selected appointment does not belong to this facility."
            )
        return value

    def validate_rendering_provider(self, value):
        if not value:
            return value

        facility = self._get_facility()
        if not facility or value.facility_id != facility.id or not value.is_active:
            raise serializers.ValidationError(
                "Selected rendering provider does not belong to this facility."
            )
        return value

    def validate_reason(self, value):
        return (value or "").strip()

    def validate(self, attrs):
        patient = attrs.get("patient", getattr(self.instance, "patient", None))
        appointment = attrs.get(
            "appointment",
            getattr(self.instance, "appointment", None),
        )
        if appointment and patient and appointment.patient_id != patient.id:
            raise serializers.ValidationError(
                {"appointment": "Appointment must belong to this patient."}
            )

        return attrs

    def create(self, validated_data):
        note_data = validated_data.pop("progress_note", {})
        request = self.context.get("request")
        facility = self._get_facility()
        staff_profile = self.context.get("staff_profile")

        if not validated_data.get("rendering_provider") and staff_profile:
            validated_data["rendering_provider"] = staff_profile

        encounter = Encounter.objects.create(
            facility=facility,
            created_by=getattr(request, "user", None),
            **validated_data,
        )
        ProgressNote.objects.create(
            encounter=encounter,
            created_by=getattr(request, "user", None),
            **note_data,
        )
        return encounter

    def update(self, instance, validated_data):
        validated_data.pop("progress_note", None)

        if instance.status == Encounter.STATUS_SIGNED:
            raise serializers.ValidationError(
                {"status": "Signed encounters cannot be edited."}
            )

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.updated_at = timezone.now()
        instance.save()
        return instance
