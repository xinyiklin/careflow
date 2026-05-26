from django.http import Http404
from rest_framework import mixins, permissions, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from audit.services import record_audit_event
from clinical.models import Encounter
from facilities.models import Staff
from facilities.security import user_has_facility_permission
from insurance.models import OrganizationInsuranceCarrierPreference
from patients.models import Patient
from shared.scoping import FacilityScopedViewSetMixin

from .models import EncounterBillingRecord
from .serializers import (
    EffectiveFeeScheduleItemSerializer,
    EncounterBillingRecordSerializer,
)
from .services import get_effective_fee_schedule_items


class BillingViewSetMixin(FacilityScopedViewSetMixin):
    def require_billing_permission(self, permission):
        facility = self.get_facility()
        if not user_has_facility_permission(self.request.user, facility.id, permission):
            raise PermissionDenied("You do not have access to billing.")
        return facility


class EncounterBillingRecordViewSet(
    BillingViewSetMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = EncounterBillingRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["facility"] = self.get_facility()
        context["staff_profile"] = self.get_staff_profile()
        return context

    def get_queryset(self):
        facility = self.require_billing_permission("billing.view")
        queryset = (
            EncounterBillingRecord.objects.filter(facility=facility)
            .select_related(
                "encounter",
                "encounter__appointment",
                "encounter__appointment__appointment_type",
                "encounter__progress_note",
                "patient",
                "facility",
                "created_by",
                "updated_by",
            )
            .prefetch_related("diagnoses", "charge_lines")
            .order_by("-updated_at", "-created_at")
        )

        patient_id = self.parse_positive_int_query_param("patient_id")
        encounter_id = self.parse_positive_int_query_param("encounter_id")
        status = self.request.query_params.get("status")

        if patient_id:
            self._ensure_patient_is_in_facility(patient_id, facility)
            queryset = queryset.filter(patient_id=patient_id)
        if encounter_id:
            self._ensure_encounter_is_in_facility(encounter_id, facility)
            queryset = queryset.filter(encounter_id=encounter_id)
        if status:
            valid_statuses = {
                choice[0] for choice in EncounterBillingRecord.STATUS_CHOICES
            }
            if status not in valid_statuses:
                raise ValidationError({"status": ["Unsupported billing status."]})
            queryset = queryset.filter(status=status)

        return queryset

    def get_object(self):
        try:
            return super().get_object()
        except Http404:
            facility = self.get_facility()
            lookup_value = self.kwargs.get(self.lookup_url_kwarg or self.lookup_field)
            if (
                lookup_value
                and EncounterBillingRecord.objects.filter(pk=lookup_value)
                .exclude(facility=facility)
                .exists()
            ):
                raise PermissionDenied("You do not have access to this billing record.")
            raise

    def _ensure_patient_is_in_facility(self, patient_id, facility):
        patient = Patient.objects.filter(pk=patient_id).only("facility_id").first()
        if patient and patient.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this patient.")

    def _ensure_encounter_is_in_facility(self, encounter_id, facility):
        encounter = (
            Encounter.objects.filter(pk=encounter_id).only("facility_id").first()
        )
        if encounter and encounter.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this encounter.")

    def perform_create(self, serializer):
        facility = self.require_billing_permission("billing.manage")
        billing_record = serializer.save()
        record_audit_event(
            actor=self.request.user,
            facility=facility,
            patient=billing_record.patient,
            action="create",
            app_label="billing",
            model_name="encounterbillingrecord",
            object_pk=billing_record.pk,
            summary="Created encounter billing record",
            metadata={
                "encounter_id": billing_record.encounter_id,
                "status": billing_record.status,
            },
        )

    def perform_update(self, serializer):
        facility = self.require_billing_permission("billing.manage")
        billing_record = serializer.save()
        record_audit_event(
            actor=self.request.user,
            facility=facility,
            patient=billing_record.patient,
            action="update",
            app_label="billing",
            model_name="encounterbillingrecord",
            object_pk=billing_record.pk,
            summary="Updated encounter billing record",
            metadata={
                "encounter_id": billing_record.encounter_id,
                "status": billing_record.status,
            },
        )


class EffectiveFeeScheduleItemViewSet(
    BillingViewSetMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = EffectiveFeeScheduleItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        facility = self.require_billing_permission("billing.view")
        staff = None
        payer_preference = None

        staff_id = self.parse_positive_int_query_param("staff_id")
        if staff_id:
            staff = (
                Staff.objects.filter(pk=staff_id, facility=facility)
                .select_related("fee_schedule")
                .first()
            )

        payer_pref_id = self.parse_positive_int_query_param("payer_preference_id")
        if payer_pref_id:
            payer_preference = (
                OrganizationInsuranceCarrierPreference.objects.filter(
                    pk=payer_pref_id,
                    organization=facility.organization,
                )
                .select_related("fee_schedule")
                .first()
            )

        serializer = self.get_serializer(
            get_effective_fee_schedule_items(facility, staff, payer_preference),
            many=True,
        )
        return Response(serializer.data)
