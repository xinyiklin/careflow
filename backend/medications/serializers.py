from rest_framework import serializers

from shared.serializers import StrictPayloadMixin

from .models import Medication


class MedicationSerializer(StrictPayloadMixin, serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    patient_chart_number = serializers.CharField(
        source="patient.chart_number",
        read_only=True,
    )
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Medication
        fields = [
            "id",
            "patient",
            "patient_name",
            "patient_chart_number",
            "facility",
            "status",
            "status_label",
            "medication_name",
            "dose",
            "route",
            "frequency",
            "start_date",
            "end_date",
            "prescriber_name",
            "notes",
            "created_by",
            "created_by_name",
            "updated_by",
            "updated_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "patient_name",
            "patient_chart_number",
            "facility",
            "status_label",
            "created_by",
            "created_by_name",
            "updated_by",
            "updated_by_name",
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

    def validate_medication_name(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Medication name is required.")
        return value

    def validate_dose(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Dose is required.")
        return value

    def validate_route(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Route is required.")
        return value

    def validate_frequency(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Frequency is required.")
        return value

    def validate_prescriber_name(self, value):
        return (value or "").strip()

    def validate_notes(self, value):
        return (value or "").strip()

    def validate(self, attrs):
        patient = attrs.get("patient", getattr(self.instance, "patient", None))
        if self.instance and patient and patient.id != self.instance.patient_id:
            raise serializers.ValidationError(
                {"patient": ["Medication patient cannot be changed."]}
            )

        start_date = attrs.get(
            "start_date",
            getattr(self.instance, "start_date", None),
        )
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError(
                {"end_date": ["End date cannot be before start date."]}
            )

        return attrs
