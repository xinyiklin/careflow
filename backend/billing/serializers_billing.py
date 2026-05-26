from django.db import transaction
from rest_framework import serializers

from clinical.models import Encounter
from shared.serializers import StrictPayloadMixin

from .models import (
    EncounterBillingRecord,
    EncounterChargeLine,
    EncounterDiagnosis,
)


class EncounterDiagnosisSerializer(StrictPayloadMixin, serializers.ModelSerializer):
    class Meta:
        model = EncounterDiagnosis
        fields = [
            "id",
            "code",
            "description",
            "sequence",
        ]
        read_only_fields = ["id"]
        extra_kwargs = {"sequence": {"required": False}}

    def validate_code(self, value):
        return (value or "").strip().upper()

    def validate_description(self, value):
        return (value or "").strip()


class EncounterChargeLineSerializer(StrictPayloadMixin, serializers.ModelSerializer):
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = EncounterChargeLine
        fields = [
            "id",
            "service_code",
            "description",
            "modifier_1",
            "modifier_2",
            "modifier_3",
            "modifier_4",
            "units",
            "charge_amount",
            "diagnosis_pointers",
            "sequence",
            "line_total",
        ]
        read_only_fields = ["id", "line_total"]
        extra_kwargs = {"sequence": {"required": False}}

    def get_line_total(self, obj):
        return f"{obj.line_total:.2f}"

    def validate_service_code(self, value):
        return (value or "").strip().upper()

    def validate_description(self, value):
        return (value or "").strip()

    def validate_diagnosis_pointers(self, value):
        if value in (None, ""):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Diagnosis pointers must be a list.")

        pointers = []
        for item in value:
            try:
                pointer = int(item)
            except (TypeError, ValueError):
                raise serializers.ValidationError(
                    "Diagnosis pointers must be positive sequence numbers."
                )
            if pointer <= 0:
                raise serializers.ValidationError(
                    "Diagnosis pointers must be positive sequence numbers."
                )
            pointers.append(pointer)

        return pointers


class EncounterBillingRecordSerializer(
    StrictPayloadMixin,
    serializers.ModelSerializer,
):
    diagnoses = EncounterDiagnosisSerializer(many=True, required=False)
    charge_lines = EncounterChargeLineSerializer(many=True, required=False)
    patient_name = serializers.SerializerMethodField()
    patient_chart_number = serializers.CharField(
        source="patient.chart_number",
        read_only=True,
    )
    appointment_time = serializers.DateTimeField(
        source="encounter.appointment.appointment_time",
        read_only=True,
    )
    appointment_type_name = serializers.CharField(
        source="encounter.appointment.appointment_type.name",
        read_only=True,
    )
    rendering_provider_name = serializers.CharField(
        source="encounter.rendering_provider_name",
        read_only=True,
    )
    encounter_status = serializers.CharField(
        source="encounter.status",
        read_only=True,
    )
    progress_note_status = serializers.CharField(
        source="encounter.progress_note.status",
        read_only=True,
    )
    total_charge_amount = serializers.SerializerMethodField()

    class Meta:
        model = EncounterBillingRecord
        fields = [
            "id",
            "encounter",
            "encounter_status",
            "patient",
            "patient_name",
            "patient_chart_number",
            "facility",
            "appointment_time",
            "appointment_type_name",
            "rendering_provider_name",
            "progress_note_status",
            "status",
            "payer_name",
            "place_of_service",
            "notes",
            "total_charge_amount",
            "diagnoses",
            "charge_lines",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "encounter_status",
            "patient",
            "patient_name",
            "patient_chart_number",
            "facility",
            "appointment_time",
            "appointment_type_name",
            "rendering_provider_name",
            "progress_note_status",
            "total_charge_amount",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]

    def get_patient_name(self, obj):
        return f"{obj.patient.last_name}, {obj.patient.first_name}"

    def get_total_charge_amount(self, obj):
        return f"{obj.total_charge_amount:.2f}"

    def _get_facility(self):
        return self.context.get("facility")

    def validate_encounter(self, value):
        facility = self._get_facility()
        if not facility or value.facility_id != facility.id:
            raise serializers.ValidationError(
                "Selected encounter does not belong to this facility."
            )

        if value.status != Encounter.STATUS_SIGNED:
            raise serializers.ValidationError(
                "Only signed encounters can be sent to billing."
            )
        if (
            not hasattr(value, "progress_note")
            or value.progress_note.status != value.progress_note.STATUS_SIGNED
        ):
            raise serializers.ValidationError(
                "Sign the progress note before billing this encounter."
            )
        if (
            not self.instance
            and EncounterBillingRecord.objects.filter(encounter=value).exists()
        ):
            raise serializers.ValidationError(
                "This encounter already has a billing record."
            )
        return value

    def validate_payer_name(self, value):
        return (value or "").strip()

    def validate_place_of_service(self, value):
        return (value or "").strip()

    def validate_notes(self, value):
        return (value or "").strip()

    def validate(self, attrs):
        diagnoses = self.initial_data.get("diagnoses", None)
        charge_lines = self.initial_data.get("charge_lines", None)

        diagnosis_data = attrs.get("diagnoses")
        charge_line_data = attrs.get("charge_lines")
        status = attrs.get("status", getattr(self.instance, "status", None))
        encounter = attrs.get("encounter")

        if self.instance and encounter and encounter.id != self.instance.encounter_id:
            raise serializers.ValidationError(
                {"encounter": ["Billing record encounter cannot be changed."]}
            )

        diagnosis_sequences = self._get_sequences(
            diagnosis_data,
            (
                self.instance.diagnoses.all()
                if self.instance and diagnoses is None
                else []
            ),
        )
        self._validate_unique_sequences(diagnosis_sequences, "diagnoses")

        charge_sequences = self._get_sequences(
            charge_line_data,
            (
                self.instance.charge_lines.all()
                if self.instance and charge_lines is None
                else []
            ),
        )
        self._validate_unique_sequences(charge_sequences, "charge_lines")

        if status in {
            EncounterBillingRecord.STATUS_READY_TO_SUBMIT,
            EncounterBillingRecord.STATUS_CLAIM_CREATED,
        }:
            errors = {}
            if not diagnosis_sequences:
                errors["diagnoses"] = ["Add at least one diagnosis before submission."]
            if not charge_sequences:
                errors["charge_lines"] = [
                    "Add at least one service line before submission."
                ]
            if errors:
                raise serializers.ValidationError(errors)

        pointer_source = charge_line_data
        if pointer_source is None and self.instance:
            pointer_source = [
                {"diagnosis_pointers": line.diagnosis_pointers}
                for line in self.instance.charge_lines.all()
            ]
        self._validate_diagnosis_pointers(pointer_source, diagnosis_sequences)

        return attrs

    def _get_sequences(self, incoming_items, existing_items):
        if incoming_items is None:
            return [item.sequence for item in existing_items]
        return [
            item.get("sequence") or index
            for index, item in enumerate(incoming_items, start=1)
        ]

    def _validate_unique_sequences(self, sequences, field_name):
        if len(sequences) != len(set(sequences)):
            raise serializers.ValidationError(
                {field_name: ["Sequences must be unique."]}
            )

    def _validate_diagnosis_pointers(self, charge_line_data, diagnosis_sequences):
        valid_pointers = set(diagnosis_sequences)
        for line in charge_line_data or []:
            for pointer in line.get("diagnosis_pointers", []):
                if pointer not in valid_pointers:
                    raise serializers.ValidationError(
                        {
                            "charge_lines": [
                                "Diagnosis pointers must reference diagnosis sequences."
                            ]
                        }
                    )

    def create(self, validated_data):
        diagnoses_data = validated_data.pop("diagnoses", [])
        charge_lines_data = validated_data.pop("charge_lines", [])
        request = self.context.get("request")
        encounter = validated_data["encounter"]

        with transaction.atomic():
            billing_record = EncounterBillingRecord.objects.create(
                facility=encounter.facility,
                patient=encounter.patient,
                created_by=getattr(request, "user", None),
                updated_by=getattr(request, "user", None),
                **validated_data,
            )
            self._replace_diagnoses(billing_record, diagnoses_data)
            self._replace_charge_lines(billing_record, charge_lines_data)
        return billing_record

    def update(self, instance, validated_data):
        diagnoses_data = validated_data.pop("diagnoses", None)
        charge_lines_data = validated_data.pop("charge_lines", None)
        request = self.context.get("request")

        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.updated_by = getattr(request, "user", None)
            instance.save()
            if diagnoses_data is not None:
                self._replace_diagnoses(instance, diagnoses_data)
            if charge_lines_data is not None:
                self._replace_charge_lines(instance, charge_lines_data)
        return instance

    def _replace_diagnoses(self, billing_record, diagnoses_data):
        billing_record.diagnoses.all().delete()
        for index, diagnosis in enumerate(diagnoses_data, start=1):
            EncounterDiagnosis.objects.create(
                billing_record=billing_record,
                sequence=diagnosis.get("sequence") or index,
                **{key: value for key, value in diagnosis.items() if key != "sequence"},
            )

    def _replace_charge_lines(self, billing_record, charge_lines_data):
        billing_record.charge_lines.all().delete()
        for index, charge_line in enumerate(charge_lines_data, start=1):
            EncounterChargeLine.objects.create(
                billing_record=billing_record,
                sequence=charge_line.get("sequence") or index,
                **{
                    key: value
                    for key, value in charge_line.items()
                    if key != "sequence"
                },
            )
