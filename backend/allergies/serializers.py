from django.utils import timezone
from rest_framework import serializers

from shared.serializers import StrictPayloadMixin

from .models import PatientAllergy


class PatientAllergySerializer(StrictPayloadMixin, serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    patient_chart_number = serializers.CharField(
        source="patient.chart_number",
        read_only=True,
    )
    category_label = serializers.CharField(
        source="get_category_display",
        read_only=True,
    )
    severity_label = serializers.CharField(
        source="get_severity_display",
        read_only=True,
    )
    status_label = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = PatientAllergy
        fields = [
            "id",
            "patient",
            "patient_name",
            "patient_chart_number",
            "facility",
            "allergen",
            "category",
            "category_label",
            "reaction",
            "severity",
            "severity_label",
            "onset_date",
            "status",
            "status_label",
            "is_active",
            "notes",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "patient_name",
            "patient_chart_number",
            "facility",
            "category_label",
            "severity_label",
            "status_label",
            "is_active",
            "created_by",
            "updated_by",
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

    def validate_allergen(self, value):
        allergen = (value or "").strip()
        if not allergen:
            raise serializers.ValidationError("Allergen is required.")
        return allergen

    def validate_reaction(self, value):
        reaction = (value or "").strip()
        if not reaction:
            raise serializers.ValidationError("Reaction is required.")
        return reaction

    def validate_notes(self, value):
        return (value or "").strip()

    def validate_onset_date(self, value):
        if value and value > timezone.localdate():
            raise serializers.ValidationError("Onset date cannot be in the future.")
        return value

    def validate(self, attrs):
        patient = attrs.get("patient", getattr(self.instance, "patient", None))
        allergen = attrs.get("allergen", getattr(self.instance, "allergen", ""))
        category = attrs.get(
            "category",
            getattr(self.instance, "category", PatientAllergy.CATEGORY_OTHER),
        )
        status = attrs.get(
            "status",
            getattr(self.instance, "status", PatientAllergy.STATUS_ACTIVE),
        )

        if self.instance and patient and patient.id != self.instance.patient_id:
            raise serializers.ValidationError(
                {"patient": ["Allergy patient cannot be changed."]}
            )

        if status == PatientAllergy.STATUS_ACTIVE and patient and allergen and category:
            duplicate_queryset = PatientAllergy.objects.filter(
                patient=patient,
                category=category,
                allergen__iexact=allergen.strip(),
                status=PatientAllergy.STATUS_ACTIVE,
            )
            if self.instance:
                duplicate_queryset = duplicate_queryset.exclude(pk=self.instance.pk)
            if duplicate_queryset.exists():
                raise serializers.ValidationError(
                    {
                        "allergen": [
                            "An active allergy already exists for this patient and allergen."
                        ]
                    }
                )

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        facility = self._get_facility()
        return PatientAllergy.objects.create(
            facility=facility,
            created_by=getattr(request, "user", None),
            updated_by=getattr(request, "user", None),
            **validated_data,
        )

    def update(self, instance, validated_data):
        request = self.context.get("request")

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.updated_by = getattr(request, "user", None)
        instance.save()
        return instance
