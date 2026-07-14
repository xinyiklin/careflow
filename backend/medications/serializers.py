from rest_framework import serializers

from shared.serializers import StrictPayloadMixin

from .models import Medication, PrescriberDelegation, RefillRequest


class MedicationCatalogEntrySerializer(serializers.Serializer):
    """One suggested medication and its common prescribing defaults."""

    generic_name = serializers.CharField()
    common_strengths = serializers.ListField(child=serializers.CharField())
    default_route = serializers.CharField()
    default_frequency = serializers.CharField()
    category = serializers.CharField()


class RouteCatalogEntrySerializer(serializers.Serializer):
    """One standardized medication administration route."""

    code = serializers.CharField()
    label = serializers.CharField()


class FrequencyCatalogEntrySerializer(serializers.Serializer):
    """One standardized medication frequency and daily-dose hint."""

    code = serializers.CharField()
    label = serializers.CharField()
    times_per_day = serializers.IntegerField(allow_null=True)


class MedicationSerializer(StrictPayloadMixin, serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    patient_chart_number = serializers.CharField(
        source="patient.chart_number",
        read_only=True,
    )
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    prescriber_display = serializers.SerializerMethodField()

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
            "prescriber",
            "prescriber_name",
            "prescriber_display",
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
            "prescriber_display",
            "created_by",
            "created_by_name",
            "updated_by",
            "updated_by_name",
            "created_at",
            "updated_at",
        ]

    def get_patient_name(self, obj):
        return f"{obj.patient.last_name}, {obj.patient.first_name}"

    def get_prescriber_display(self, obj):
        if obj.prescriber_id:
            return (
                getattr(obj.prescriber, "display_name", "") or obj.prescriber_name or ""
            )
        return obj.prescriber_name or ""

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


class RefillRequestSerializer(serializers.ModelSerializer):
    """Clinician read shape for a refill request.

    Surfaces the medication and pharmacy snapshots plus clinician audit
    fields (``clinician_note``, ``resolved_by_name``, ``resolved_at``).
    Read-only; writes flow through the dedicated ``approve`` / ``deny``
    detail routes on :class:`RefillRequestViewSet`.
    """

    patient_id = serializers.IntegerField(source="patient.id", read_only=True)
    patient_display_name = serializers.SerializerMethodField()
    medication_id = serializers.IntegerField(source="medication.id", read_only=True)
    medication_name = serializers.CharField(
        source="medication.medication_name", read_only=True
    )
    dose = serializers.CharField(source="medication.dose", read_only=True)
    frequency = serializers.CharField(source="medication.frequency", read_only=True)
    pharmacy_id = serializers.IntegerField(
        source="pharmacy.id", read_only=True, allow_null=True
    )
    prescriber_id = serializers.IntegerField(
        source="medication.prescriber_id", read_only=True, allow_null=True
    )
    prescriber_display = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    source_label = serializers.CharField(source="get_source_display", read_only=True)

    class Meta:
        model = RefillRequest
        fields = [
            "id",
            "patient_id",
            "patient_display_name",
            "medication_id",
            "medication_name",
            "dose",
            "frequency",
            "pharmacy_id",
            "pharmacy_name",
            "days_supply",
            "prescriber_id",
            "prescriber_display",
            "source",
            "source_label",
            "status",
            "status_label",
            "patient_note",
            "clinician_note",
            "requested_at",
            "resolved_at",
            "resolved_by_name",
        ]
        read_only_fields = fields

    def get_patient_display_name(self, obj):
        return f"{obj.patient.last_name}, {obj.patient.first_name}"

    def get_prescriber_display(self, obj):
        medication = obj.medication
        if medication.prescriber_id:
            return (
                getattr(medication.prescriber, "display_name", "")
                or medication.prescriber_name
                or ""
            )
        return medication.prescriber_name or ""


class RefillRequestActionSerializer(StrictPayloadMixin, serializers.Serializer):
    """Input body for ``approve`` / ``deny`` detail routes.

    Both actions accept an optional ``clinician_note``; the view layer
    enforces ``status == pending`` and the resolver stamping.
    """

    clinician_note = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_clinician_note(self, value):
        return (value or "").strip()


class PrescriberDelegationSerializer(StrictPayloadMixin, serializers.ModelSerializer):
    """Admin read/write shape for a prescriber delegation (agent model).

    ``facility`` is assigned by the view; ``prescriber`` (CareProvider) and
    ``delegate`` (Staff) are client-supplied and validated against the
    facility. Display fields are denormalized for the admin table.
    """

    prescriber_display = serializers.SerializerMethodField()
    delegate_name = serializers.SerializerMethodField()

    class Meta:
        model = PrescriberDelegation
        fields = [
            "id",
            "facility",
            "prescriber",
            "prescriber_display",
            "delegate",
            "delegate_name",
            "is_active",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "facility",
            "prescriber_display",
            "delegate_name",
            "created_at",
        ]

    def get_prescriber_display(self, obj):
        return getattr(obj.prescriber, "display_name", "") or ""

    def get_delegate_name(self, obj):
        user = getattr(obj.delegate, "user", None)
        if not user:
            return ""
        full = f"{user.first_name} {user.last_name}".strip()
        return full or user.get_username()

    def validate(self, attrs):
        facility = self.context.get("facility")
        prescriber = attrs.get("prescriber", getattr(self.instance, "prescriber", None))
        delegate = attrs.get("delegate", getattr(self.instance, "delegate", None))

        if facility and prescriber and prescriber.facility_id != facility.id:
            raise serializers.ValidationError(
                {
                    "prescriber": [
                        "Selected prescriber does not belong to this facility."
                    ]
                }
            )
        if facility and delegate and delegate.facility_id != facility.id:
            raise serializers.ValidationError(
                {"delegate": ["Selected delegate does not belong to this facility."]}
            )

        if facility and prescriber and delegate:
            duplicate = PrescriberDelegation.objects.filter(
                facility=facility,
                prescriber=prescriber,
                delegate=delegate,
            )
            if self.instance:
                duplicate = duplicate.exclude(pk=self.instance.pk)
            if duplicate.exists():
                raise serializers.ValidationError(
                    {"delegate": ["This delegation already exists."]}
                )

        return attrs
