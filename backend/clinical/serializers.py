from django.utils import timezone
from rest_framework import serializers

from shared.serializers import StrictPayloadMixin

from .models import Encounter, ProgressNote, Vitals


class VitalsSerializer(StrictPayloadMixin, serializers.ModelSerializer):
    bmi = serializers.SerializerMethodField()

    class Meta:
        model = Vitals
        fields = [
            "id",
            "encounter",
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
            "recorded_by",
            "recorded_by_name",
            "notes",
            "bmi",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "recorded_by",
            "recorded_by_name",
            "bmi",
            "created_at",
            "updated_at",
        ]

    def get_bmi(self, obj):
        value = obj.bmi
        return str(value) if value is not None else None

    def validate(self, attrs):
        if self.instance and self.instance.encounter.status == Encounter.STATUS_SIGNED:
            raise serializers.ValidationError(
                {"encounter": ["Vitals are locked after the encounter is signed."]}
            )

        # Mirror the model-level clean() check so DRF returns a clean
        # ``400 Bad Request`` instead of a 500 from
        # ``full_clean()`` raising during save.
        bp_systolic = attrs.get(
            "bp_systolic", getattr(self.instance, "bp_systolic", None)
        )
        bp_diastolic = attrs.get(
            "bp_diastolic", getattr(self.instance, "bp_diastolic", None)
        )
        if bp_systolic and bp_diastolic and bp_diastolic >= bp_systolic:
            raise serializers.ValidationError(
                {"bp_diastolic": ["Diastolic must be less than systolic."]}
            )
        return attrs


class ProgressNoteSerializer(StrictPayloadMixin, serializers.ModelSerializer):
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
        if self.instance and (
            self.instance.status == ProgressNote.STATUS_SIGNED
            or self.instance.encounter.status == Encounter.STATUS_SIGNED
        ):
            raise serializers.ValidationError(
                {"status": ["Signed progress notes cannot be edited."]}
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


class EncounterSerializer(StrictPayloadMixin, serializers.ModelSerializer):
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
    payer_name = serializers.SerializerMethodField()
    is_effectively_billable = serializers.SerializerMethodField()

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
            "payer_name",
            "is_effectively_billable",
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
            "payer_name",
            "is_effectively_billable",
        ]
        extra_kwargs = {
            "appointment": {"validators": []},
        }

    def get_payer_name(self, obj):
        primary_policy = (
            obj.patient.insurance_policies.filter(is_primary=True, is_active=True)
            .select_related("carrier")
            .first()
        )
        if primary_policy:
            return primary_policy.carrier.name
        return None

    def get_patient_name(self, obj):
        return f"{obj.patient.last_name}, {obj.patient.first_name}"

    def get_is_effectively_billable(self, obj):
        if not obj.appointment:
            return True
        return obj.appointment.is_effectively_billable

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
        if self.instance and "progress_note" in attrs:
            raise serializers.ValidationError(
                {
                    "progress_note": [
                        "Update progress notes through the progress note endpoint."
                    ]
                }
            )

        patient = attrs.get("patient", getattr(self.instance, "patient", None))
        appointment = attrs.get(
            "appointment",
            getattr(self.instance, "appointment", None),
        )
        rendering_provider = attrs.get(
            "rendering_provider",
            getattr(self.instance, "rendering_provider", None),
        )

        if self.instance and patient and patient.id != self.instance.patient_id:
            raise serializers.ValidationError(
                {"patient": ["Encounter patient cannot be changed."]}
            )

        if appointment and patient and appointment.patient_id != patient.id:
            raise serializers.ValidationError(
                {"appointment": ["Appointment must belong to this patient."]}
            )

        if (
            appointment
            and appointment.rendering_provider_id
            and not rendering_provider
            and not self.instance
        ):
            attrs["rendering_provider"] = appointment.rendering_provider
            rendering_provider = appointment.rendering_provider

        if appointment and appointment.rendering_provider_id:
            appointment_provider_id = appointment.rendering_provider_id
            if (
                not rendering_provider
                or appointment_provider_id != rendering_provider.id
            ):
                raise serializers.ValidationError(
                    {
                        "rendering_provider": [
                            "Rendering provider must match the appointment provider."
                        ]
                    }
                )

        if appointment:
            existing_encounter = Encounter.objects.filter(
                appointment=appointment,
            )
            if self.instance:
                existing_encounter = existing_encounter.exclude(pk=self.instance.pk)

            existing_status = existing_encounter.values_list(
                "status",
                flat=True,
            ).first()
            if existing_status == Encounter.STATUS_IN_PROGRESS:
                raise serializers.ValidationError(
                    {"appointment": ["Appointment already has an active encounter."]}
                )
            if existing_status:
                raise serializers.ValidationError(
                    {"appointment": ["Appointment already has a clinical encounter."]}
                )

        return attrs

    def create(self, validated_data):
        note_data = validated_data.pop("progress_note", {})
        request = self.context.get("request")
        facility = self._get_facility()
        staff_profile = self.context.get("staff_profile")
        appointment = validated_data.get("appointment")

        if not validated_data.get("rendering_provider"):
            if appointment and appointment.rendering_provider_id:
                validated_data["rendering_provider"] = appointment.rendering_provider
            elif staff_profile:
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
        if instance.status == Encounter.STATUS_SIGNED:
            raise serializers.ValidationError(
                {"status": ["Signed encounters cannot be edited."]}
            )

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.updated_at = timezone.now()
        instance.save()
        return instance
