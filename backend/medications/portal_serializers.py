from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from rest_framework import serializers

from patients.models import Pharmacy

from .models import Medication, RefillRequest


class PortalMedicationSerializer(serializers.ModelSerializer):
    """Read-only medication record for the patient portal.

    Exposes prescriber name only as a display string; never surfaces the
    clinician User identifier or audit (``created_by``, ``updated_by``,
    ``*_by_name``) fields.
    """

    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Medication
        fields = [
            "id",
            "medication_name",
            "dose",
            "route",
            "frequency",
            "start_date",
            "end_date",
            "status",
            "status_label",
            "prescriber_name",
        ]
        read_only_fields = fields


class PortalRefillRequestSerializer(serializers.ModelSerializer):
    """Read shape for a patient's own refill requests.

    Strips clinician audit fields (``clinician_note``, ``resolved_by``,
    ``resolved_by_name``, ``created_by_name``) — the patient only sees
    the request, the medication snapshot, and the resolution timestamp.
    """

    medication_id = serializers.IntegerField(source="medication.id", read_only=True)
    medication_name = serializers.CharField(
        source="medication.medication_name", read_only=True
    )
    dose = serializers.CharField(source="medication.dose", read_only=True)
    frequency = serializers.CharField(source="medication.frequency", read_only=True)
    pharmacy_id = serializers.IntegerField(
        source="pharmacy.id", read_only=True, allow_null=True
    )
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = RefillRequest
        fields = [
            "id",
            "medication_id",
            "medication_name",
            "dose",
            "frequency",
            "pharmacy_id",
            "pharmacy_name",
            "status",
            "status_label",
            "patient_note",
            "requested_at",
            "resolved_at",
        ]
        read_only_fields = fields


class PortalRefillRequestCreateSerializer(serializers.Serializer):
    """Write shape for ``POST /v1/portal/refill-requests/``.

    Patient supplies the medication and an optional note + pharmacy
    override. The view layer resolves the medication (raising 404 on
    cross-patient access) and verifies cross-facility pharmacy
    eligibility (raising 403) *before* calling ``save``; this serializer
    only enforces shape and the active-medication + duplicate-pending
    invariants.
    """

    medication_id = serializers.IntegerField()
    patient_note = serializers.CharField(
        required=False, allow_blank=True, max_length=500
    )
    pharmacy_id = serializers.IntegerField(required=False, allow_null=True)

    def create(self, validated_data):
        patient = self.context["patient"]
        medication = self.context["medication"]
        pharmacy = self.context.get("pharmacy")

        if medication.status != Medication.STATUS_ACTIVE:
            raise serializers.ValidationError(
                {"medication_id": "Refill requests require an active medication."}
            )

        try:
            refill = RefillRequest.objects.create(
                medication=medication,
                patient=patient,
                facility=patient.facility,
                pharmacy=pharmacy,
                pharmacy_name=(pharmacy.name if pharmacy else ""),
                status=RefillRequest.STATUS_PENDING,
                patient_note=validated_data.get("patient_note", ""),
            )
        except (IntegrityError, DjangoValidationError) as exc:
            # ``unique_pending_refill_per_medication`` surfaces either
            # as a DB ``IntegrityError`` (raw SQL path) or — because
            # ``RefillRequest.save`` calls ``full_clean()`` — as a
            # ``ValidationError`` whose message names the constraint.
            message = str(exc)
            if "unique_pending_refill_per_medication" in message:
                raise serializers.ValidationError(
                    {
                        "medication_id": (
                            "A pending refill request already exists "
                            "for this medication."
                        )
                    }
                ) from exc
            if isinstance(exc, DjangoValidationError):
                detail = getattr(exc, "message_dict", None) or {"detail": exc.messages}
                raise serializers.ValidationError(detail) from exc
            raise
        return refill


class PortalPharmacySerializer(serializers.ModelSerializer):
    """Minimal pharmacy payload for the portal directory and selectors."""

    address_line = serializers.SerializerMethodField()
    city = serializers.SerializerMethodField()
    state = serializers.SerializerMethodField()
    zip = serializers.SerializerMethodField()

    class Meta:
        model = Pharmacy
        fields = [
            "id",
            "name",
            "address_line",
            "city",
            "state",
            "zip",
            "phone_number",
        ]
        read_only_fields = fields

    def get_address_line(self, obj):
        address = obj.address
        if not address:
            return ""
        line_2 = f" {address.line_2}" if address.line_2 else ""
        return f"{address.line_1}{line_2}".strip()

    def get_city(self, obj):
        return obj.address.city if obj.address else ""

    def get_state(self, obj):
        return obj.address.state if obj.address else ""

    def get_zip(self, obj):
        return obj.address.zip_code if obj.address else ""


class PortalPreferredPharmacyUpdateSerializer(serializers.Serializer):
    """Body for ``PATCH /v1/portal/me/preferred-pharmacy/``.

    Shape-only — the view resolves and authorizes the pharmacy so that
    cross-facility selection can return 403 rather than a 400 body
    validation error.
    """

    pharmacy_id = serializers.IntegerField(allow_null=True)
