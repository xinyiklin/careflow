"""Patient-portal serializers for clinical encounters, notes, and vitals.

All fields are read-only and stripped of clinician PII / audit identifiers
(``created_by``, ``updated_by``, internal user FKs). Signed-by clinician
identity surfaces only as a display name.
"""

from rest_framework import serializers

from allergies.models import PatientAllergy
from medications.models import Medication

from .models import Encounter, ProgressNote, Vitals


class PortalVitalsSerializer(serializers.ModelSerializer):
    bmi = serializers.SerializerMethodField()

    class Meta:
        model = Vitals
        fields = [
            "height_cm",
            "weight_kg",
            "bp_systolic",
            "bp_diastolic",
            "heart_rate_bpm",
            "respiratory_rate",
            "temperature_c",
            "spo2_percent",
            "pain_score",
            "measured_at",
            "bmi",
        ]
        read_only_fields = fields

    def get_bmi(self, obj):
        bmi = obj.bmi
        return str(bmi) if bmi is not None else None


class PortalProgressNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgressNote
        fields = [
            "subjective",
            "objective",
            "assessment",
            "plan",
            "signed_by_name",
            "signed_at",
        ]
        read_only_fields = fields


class PortalEncounterSummarySerializer(serializers.ModelSerializer):
    """Single signed visit with attached progress note + vitals (if any)."""

    progress_note = PortalProgressNoteSerializer(read_only=True)
    vitals = PortalVitalsSerializer(read_only=True)
    provider_display_name = serializers.CharField(
        source="rendering_provider_name", read_only=True
    )
    facility_name = serializers.CharField(source="facility.name", read_only=True)

    class Meta:
        model = Encounter
        fields = [
            "id",
            "started_at",
            "ended_at",
            "reason",
            "provider_display_name",
            "facility_name",
            "progress_note",
            "vitals",
        ]
        read_only_fields = fields


class PortalMedicalSummaryMedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medication
        fields = [
            "id",
            "medication_name",
            "dose",
            "route",
            "frequency",
            "start_date",
            "prescriber_name",
        ]
        read_only_fields = fields


class PortalMedicalSummaryAllergySerializer(serializers.ModelSerializer):
    category_label = serializers.CharField(
        source="get_category_display", read_only=True
    )
    severity_label = serializers.CharField(
        source="get_severity_display", read_only=True
    )

    class Meta:
        model = PatientAllergy
        fields = [
            "id",
            "allergen",
            "category",
            "category_label",
            "severity",
            "severity_label",
            "reaction",
            "onset_date",
        ]
        read_only_fields = fields
