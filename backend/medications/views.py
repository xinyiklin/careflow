from django.db import transaction
from django.http import Http404
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework import mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from audit.services import record_audit_event
from facilities.security import user_has_facility_permission
from patients.models import Patient
from shared.scoping import FacilityScopedViewSetMixin

from .models import Medication, PrescriberDelegation, RefillRequest
from .serializers import (
    MedicationSerializer,
    PrescriberDelegationSerializer,
    RefillRequestActionSerializer,
    RefillRequestSerializer,
)

FACILITY_ID_PARAMETER = OpenApiParameter(
    "facility_id",
    OpenApiTypes.INT,
    OpenApiParameter.QUERY,
    required=False,
    description="Facility scope. Defaults to the user's active default facility.",
)

REFILL_REQUEST_LIST_PARAMETERS = [
    FACILITY_ID_PARAMETER,
    OpenApiParameter(
        "patient_id",
        OpenApiTypes.INT,
        OpenApiParameter.QUERY,
        required=False,
        description="Filter to one patient in the selected facility.",
    ),
    OpenApiParameter(
        "status",
        OpenApiTypes.STR,
        OpenApiParameter.QUERY,
        required=False,
        enum=[choice[0] for choice in RefillRequest.STATUS_CHOICES],
        description="Filter by refill request status.",
    ),
    OpenApiParameter(
        "source",
        OpenApiTypes.STR,
        OpenApiParameter.QUERY,
        required=False,
        enum=[choice[0] for choice in RefillRequest.SOURCE_CHOICES],
        description="Filter by request source.",
    ),
    OpenApiParameter(
        "prescriber_id",
        OpenApiTypes.INT,
        OpenApiParameter.QUERY,
        required=False,
        description="Filter by the medication's structured prescriber.",
    ),
    OpenApiParameter(
        "mine",
        OpenApiTypes.BOOL,
        OpenApiParameter.QUERY,
        required=False,
        description="Filter to the current user's linked prescriber profile.",
    ),
]


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

        prescriber = serializer.validated_data.get("prescriber")
        if prescriber and prescriber.facility_id != facility.id:
            raise PermissionDenied(
                "Selected prescriber does not belong to this facility."
            )

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

        prescriber = serializer.validated_data.get(
            "prescriber", serializer.instance.prescriber
        )
        if prescriber and prescriber.facility_id != facility.id:
            raise PermissionDenied(
                "Selected prescriber does not belong to this facility."
            )

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
    actions require ``medications.refill.approve``, and non-prescriber
    agents additionally need an active ``PrescriberDelegation`` under the
    medication's prescriber (see ``_enforce_prescriber_authority``).
    Patient-initiated creates and cancels live on the portal viewset — this
    surface is
    intentionally read-plus-resolve only. Approving does NOT auto-create
    a new ``Medication`` row; the product treats approval as a soft
    acknowledgment.
    """

    serializer_class = RefillRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    @extend_schema(parameters=REFILL_REQUEST_LIST_PARAMETERS)
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(parameters=[FACILITY_ID_PARAMETER])
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    def get_queryset(self):
        facility = self._require_permission(
            "medications.view",
            "You do not have access to view refill requests.",
        )
        queryset = (
            RefillRequest.objects.filter(facility=facility)
            .select_related(
                "medication",
                "medication__prescriber",
                "patient",
                "facility",
                "pharmacy",
                "resolved_by",
            )
            .order_by("-requested_at")
        )

        patient_id = self.parse_positive_int_query_param("patient_id")
        status_value = self.request.query_params.get("status")
        source_value = self.request.query_params.get("source")
        prescriber_id = self.parse_positive_int_query_param("prescriber_id")
        mine = self.request.query_params.get("mine")

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
        if source_value:
            valid_sources = {choice[0] for choice in RefillRequest.SOURCE_CHOICES}
            if source_value not in valid_sources:
                raise ValidationError(
                    {"source": ["Unsupported refill request source."]}
                )
            queryset = queryset.filter(source=source_value)
        if prescriber_id:
            queryset = queryset.filter(medication__prescriber_id=prescriber_id)
        # ``mine`` scopes to refills for medications prescribed by the
        # current user's linked care-provider profile. Resolved server-side
        # so the client never needs the user-to-provider mapping.
        if str(mine).lower() in {"1", "true", "yes"}:
            queryset = queryset.filter(
                medication__prescriber__linked_staff__user=self.request.user
            )

        return queryset

    # Note: no ``get_object`` override. Cross-facility refill requests
    # are surfaced as 404 (per spec) — refill rows are workflow items,
    # not first-class resources, so we don't expose the existence of a
    # record in another facility via a 403 sentinel.

    @extend_schema(
        parameters=[FACILITY_ID_PARAMETER],
        request=RefillRequestActionSerializer,
        responses=RefillRequestSerializer,
    )
    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        return self._resolve(
            request,
            new_status=RefillRequest.STATUS_APPROVED,
            audit_summary_prefix="Approved refill request for",
        )

    @extend_schema(
        parameters=[FACILITY_ID_PARAMETER],
        request=RefillRequestActionSerializer,
        responses=RefillRequestSerializer,
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
            "medications.refill.approve",
            "You do not have access to resolve refill requests.",
        )

        body = RefillRequestActionSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        clinician_note = body.validated_data.get("clinician_note", "")

        with transaction.atomic():
            refill = self._get_locked_object()
            if refill.facility_id != facility.id:
                raise PermissionDenied("You do not have access to this refill request.")

            self._enforce_prescriber_authority(refill, facility)

            if refill.status != RefillRequest.STATUS_PENDING:
                raise ValidationError(
                    {"status": "Only pending refill requests can be resolved."}
                )

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

    def _get_locked_object(self):
        queryset = self.filter_queryset(self.get_queryset()).select_for_update(
            of=("self",)
        )
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)
        filter_kwargs = {self.lookup_field: lookup_value}
        obj = get_object_or_404(queryset, **filter_kwargs)
        self.check_object_permissions(self.request, obj)
        return obj

    def _enforce_prescriber_authority(self, refill, facility):
        """Agent-model gate on resolving a refill.

        Prescribers (``medications.prescribe``) act on their own authority —
        the facility queue is shared, so any prescriber may resolve. A
        non-prescriber holding ``medications.refill.approve`` is an agent and
        may resolve only when an active :class:`PrescriberDelegation` ties
        them to the medication's prescriber. If the medication has no
        structured prescriber yet there is nothing to enforce against, so the
        action is allowed (keeps legacy/un-assigned meds working).
        """
        user = self.request.user
        if user_has_facility_permission(user, facility.id, "medications.prescribe"):
            return

        prescriber = refill.medication.prescriber
        if prescriber is None:
            return

        has_delegation = PrescriberDelegation.objects.filter(
            facility=facility,
            prescriber=prescriber,
            delegate__user=user,
            delegate__facility=facility,
            delegate__is_active=True,
            is_active=True,
        ).exists()
        if not has_delegation:
            raise PermissionDenied(
                "You can only resolve refills for prescribers you are "
                "delegated under."
            )

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


class PrescriberDelegationViewSet(FacilityScopedViewSetMixin, viewsets.ModelViewSet):
    """Facility-scoped CRUD for prescriber delegations (agent model).

    Gated on ``admin.security.manage`` — delegations are an access/authority
    assignment, managed alongside roles and permissions. Active delegations
    let non-prescriber refill agents resolve requests for a medication's
    structured prescriber.
    """

    serializer_class = PrescriberDelegationSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    PERMISSION = "admin.security.manage"
    PERMISSION_MESSAGE = "You do not have access to manage prescriber delegations."

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["facility"] = self.get_facility()
        return context

    @extend_schema(parameters=[FACILITY_ID_PARAMETER])
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(parameters=[FACILITY_ID_PARAMETER])
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(parameters=[FACILITY_ID_PARAMETER])
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(parameters=[FACILITY_ID_PARAMETER])
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(parameters=[FACILITY_ID_PARAMETER])
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    def get_queryset(self):
        facility = self._require_permission(self.PERMISSION, self.PERMISSION_MESSAGE)
        return (
            PrescriberDelegation.objects.filter(facility=facility)
            .select_related("prescriber", "delegate", "delegate__user")
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        facility = self._require_permission(self.PERMISSION, self.PERMISSION_MESSAGE)
        serializer.save(facility=facility)

    def perform_update(self, serializer):
        facility = self._require_permission(self.PERMISSION, self.PERMISSION_MESSAGE)
        if serializer.instance.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this delegation.")
        serializer.save()

    def perform_destroy(self, instance):
        facility = self._require_permission(self.PERMISSION, self.PERMISSION_MESSAGE)
        if instance.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this delegation.")
        instance.delete()

    def _require_permission(self, permission, message):
        facility = self.get_facility()
        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            permission,
        ):
            raise PermissionDenied(message)
        return facility
