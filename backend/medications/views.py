from django.db import transaction
from django.http import Http404
from django.utils import timezone
from rest_framework import mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from audit.services import record_audit_event
from facilities.security import user_has_facility_permission
from patients.models import Patient
from shared.scoping import FacilityScopedViewSetMixin

from .models import Medication, RefillRequest
from .serializers import (
    MedicationSerializer,
    RefillRequestActionSerializer,
    RefillRequestSerializer,
)


class MedicationViewSet(FacilityScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = MedicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["facility"] = self.get_facility()
        return context

    def get_queryset(self):
        facility = self._require_permission(
            "medications.view",
            "You do not have access to view medications.",
        )
        queryset = (
            Medication.objects.filter(facility=facility)
            .select_related("patient", "facility", "created_by", "updated_by")
            .order_by("medication_name", "-start_date", "-created_at")
        )

        patient_id = self.parse_positive_int_query_param("patient_id")
        status = self.request.query_params.get("status")

        if patient_id:
            self._ensure_patient_is_in_facility(patient_id, facility)
            queryset = queryset.filter(patient_id=patient_id)
        if status:
            valid_statuses = {choice[0] for choice in Medication.STATUS_CHOICES}
            if status not in valid_statuses:
                raise ValidationError({"status": ["Unsupported medication status."]})
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
                and Medication.objects.filter(pk=lookup_value)
                .exclude(facility=facility)
                .exists()
            ):
                raise PermissionDenied("You do not have access to this medication.")
            raise

    def perform_create(self, serializer):
        facility = self._require_permission(
            "medications.manage",
            "You do not have access to manage medications.",
        )
        patient = serializer.validated_data["patient"]
        if patient.facility_id != facility.id:
            raise PermissionDenied("Selected patient does not belong to this facility.")

        medication = serializer.save(
            facility=facility,
            created_by=self.request.user,
            updated_by=self.request.user,
        )
        self._record_medication_event(medication, "create", "Created medication")

    def perform_update(self, serializer):
        facility = self._require_permission(
            "medications.manage",
            "You do not have access to manage medications.",
        )
        if serializer.instance.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this medication.")

        patient = serializer.validated_data.get("patient", serializer.instance.patient)
        if patient.facility_id != facility.id:
            raise PermissionDenied("Selected patient does not belong to this facility.")

        medication = serializer.save(updated_by=self.request.user)
        self._record_medication_event(medication, "update", "Updated medication")

    def perform_destroy(self, instance):
        facility = self._require_permission(
            "medications.manage",
            "You do not have access to manage medications.",
        )
        if instance.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this medication.")

        instance.discontinue(user=self.request.user)
        self._record_medication_event(instance, "delete", "Discontinued medication")

    def _require_permission(self, permission, message):
        facility = self.get_facility()
        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            permission,
        ):
            raise PermissionDenied(message)
        return facility

    def _ensure_patient_is_in_facility(self, patient_id, facility):
        patient = Patient.objects.filter(pk=patient_id).only("facility_id").first()
        if patient and patient.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this patient.")

    def _record_medication_event(self, medication, action, summary):
        record_audit_event(
            actor=self.request.user,
            facility=medication.facility,
            patient=medication.patient,
            action=action,
            app_label="medications",
            model_name="medication",
            object_pk=medication.pk,
            summary=f"{summary}: {medication.medication_name}",
            metadata={"status": medication.status},
        )


class RefillRequestViewSet(
    FacilityScopedViewSetMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Clinician-side list/detail/approve/deny for refill requests.

    Reads are gated on ``medications.view``; ``approve`` and ``deny``
    actions require ``medications.manage``. Patient-initiated creates
    and cancels live on the portal viewset — this surface is
    intentionally read-plus-resolve only. Approving does NOT auto-create
    a new ``Medication`` row; the product treats approval as a soft
    acknowledgment.
    """

    serializer_class = RefillRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        facility = self._require_permission(
            "medications.view",
            "You do not have access to view refill requests.",
        )
        queryset = (
            RefillRequest.objects.filter(facility=facility)
            .select_related(
                "medication",
                "patient",
                "facility",
                "pharmacy",
                "resolved_by",
            )
            .order_by("-requested_at")
        )

        patient_id = self.parse_positive_int_query_param("patient_id")
        status_value = self.request.query_params.get("status")

        if patient_id:
            self._ensure_patient_is_in_facility(patient_id, facility)
            queryset = queryset.filter(patient_id=patient_id)
        if status_value:
            valid_statuses = {choice[0] for choice in RefillRequest.STATUS_CHOICES}
            if status_value not in valid_statuses:
                raise ValidationError(
                    {"status": ["Unsupported refill request status."]}
                )
            queryset = queryset.filter(status=status_value)

        return queryset

    # Note: no ``get_object`` override. Cross-facility refill requests
    # are surfaced as 404 (per spec) — refill rows are workflow items,
    # not first-class resources, so we don't expose the existence of a
    # record in another facility via a 403 sentinel.

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        return self._resolve(
            request,
            new_status=RefillRequest.STATUS_APPROVED,
            audit_summary_prefix="Approved refill request for",
        )

    @action(detail=True, methods=["post"])
    def deny(self, request, pk=None):
        return self._resolve(
            request,
            new_status=RefillRequest.STATUS_DENIED,
            audit_summary_prefix="Denied refill request for",
        )

    def _resolve(self, request, *, new_status, audit_summary_prefix):
        facility = self._require_permission(
            "medications.manage",
            "You do not have access to manage refill requests.",
        )
        refill = self.get_object()
        if refill.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this refill request.")

        body = RefillRequestActionSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        clinician_note = body.validated_data.get("clinician_note", "")

        if refill.status != RefillRequest.STATUS_PENDING:
            raise ValidationError(
                {"status": "Only pending refill requests can be resolved."}
            )

        with transaction.atomic():
            refill.status = new_status
            refill.resolved_at = timezone.now()
            refill.resolved_by = request.user
            if clinician_note:
                refill.clinician_note = clinician_note
            # ``RefillRequest.save`` stamps ``resolved_by_name`` from
            # ``resolved_by`` — mirrors how ``Medication.created_by_name``
            # is populated by its model ``save``.
            refill.save()
            record_audit_event(
                actor=request.user,
                facility=facility,
                patient=refill.patient,
                action="update",
                app_label="medications",
                model_name="refillrequest",
                object_pk=refill.pk,
                summary=(f"{audit_summary_prefix} {refill.medication.medication_name}"),
                metadata={"status": refill.status},
            )

        return Response(self.get_serializer(refill).data)

    def _require_permission(self, permission, message):
        facility = self.get_facility()
        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            permission,
        ):
            raise PermissionDenied(message)
        return facility

    def _ensure_patient_is_in_facility(self, patient_id, facility):
        patient = Patient.objects.filter(pk=patient_id).only("facility_id").first()
        if patient and patient.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this patient.")
