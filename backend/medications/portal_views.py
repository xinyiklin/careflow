"""Portal endpoints for patient-facing medication and refill flows.

All endpoints are gated by :class:`IsPortalPatient` and scoped to the
requesting patient via :func:`get_patient_for_user`. Responses strip
clinician-side audit fields; refill writes refuse cross-patient and
cross-facility access at the queryset / serializer level.
"""

from datetime import timedelta

from django.db import transaction
from django.db.models import Case, IntegerField, Value, When
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from patients.models import Pharmacy
from patients.pharmacy_access import get_effective_pharmacy_ids
from users.permissions import IsPortalPatient
from users.portal_access import get_patient_for_user

from .models import Medication, RefillRequest
from .portal_serializers import (
    PortalMedicationSerializer,
    PortalPharmacySerializer,
    PortalRefillRequestCreateSerializer,
    PortalRefillRequestSerializer,
)


@extend_schema(
    responses=PortalMedicationSerializer(many=True),
    summary="Patient portal medications",
)
class PortalMedicationListView(ListAPIView):
    """List the authenticated patient's medications.

    Active medications surface first; remaining records (inactive or
    discontinued) follow. Within each group results are ordered by
    ``created_at`` descending so the most recently entered medications
    appear at the top of their group.
    """

    serializer_class = PortalMedicationSerializer
    permission_classes = [IsPortalPatient]
    pagination_class = None

    def get_queryset(self):
        patient = get_patient_for_user(self.request.user)
        return (
            Medication.objects.filter(patient=patient)
            .select_related("patient")
            .annotate(
                _status_rank=Case(
                    When(status=Medication.STATUS_ACTIVE, then=Value(0)),
                    default=Value(1),
                    output_field=IntegerField(),
                ),
            )
            .order_by("_status_rank", "-created_at")
        )


REFILL_REQUEST_LOOKBACK_DAYS = 90


@extend_schema(
    responses=PortalRefillRequestSerializer(many=True),
    summary="Patient portal refill requests (last 90 days)",
)
class RefillRequestListCreateView(APIView):
    """List or create refill requests for the authenticated patient.

    GET returns the patient's own requests from the last 90 days,
    ordered by ``-requested_at``. POST validates the medication belongs
    to the patient, is active, has no pending request open, and (if
    supplied) that the pharmacy is reachable by the patient's facility.
    """

    permission_classes = [IsPortalPatient]

    def get(self, request):
        patient = get_patient_for_user(request.user)
        cutoff = timezone.now() - timedelta(days=REFILL_REQUEST_LOOKBACK_DAYS)
        queryset = (
            RefillRequest.objects.filter(
                patient=patient,
                requested_at__gte=cutoff,
            )
            .select_related("medication", "pharmacy")
            .order_by("-requested_at")
        )
        return Response(PortalRefillRequestSerializer(queryset, many=True).data)

    @extend_schema(
        request=PortalRefillRequestCreateSerializer,
        responses={201: PortalRefillRequestSerializer},
    )
    def post(self, request):
        patient = get_patient_for_user(request.user)
        shape = PortalRefillRequestCreateSerializer(data=request.data)
        shape.is_valid(raise_exception=True)

        medication_id = shape.validated_data["medication_id"]
        pharmacy_id = shape.validated_data.get("pharmacy_id")

        medication = (
            Medication.objects.filter(pk=medication_id, patient=patient)
            .select_related("patient")
            .first()
        )
        if not medication:
            # 404 (not 400/403) when the medication isn't owned by the
            # requesting patient — keeps the "exists elsewhere" leak
            # surface the same as the "doesn't exist" surface.
            raise NotFound("Medication not found.")

        pharmacy = None
        if pharmacy_id is not None:
            allowed_ids = get_effective_pharmacy_ids(patient.facility)
            if pharmacy_id not in allowed_ids:
                raise PermissionDenied("Pharmacy is not available at your facility.")
            pharmacy = Pharmacy.objects.filter(pk=pharmacy_id, is_active=True).first()
            if not pharmacy:
                raise PermissionDenied("Pharmacy is not available at your facility.")
        else:
            pharmacy = patient.preferred_pharmacy

        # Re-bind through the create serializer so we get a uniform
        # ``ValidationError`` path for active-medication and
        # duplicate-pending invariants.
        creator = PortalRefillRequestCreateSerializer(
            data=request.data,
            context={
                "patient": patient,
                "medication": medication,
                "pharmacy": pharmacy,
            },
        )
        creator.is_valid(raise_exception=True)
        refill = creator.save()
        return Response(
            PortalRefillRequestSerializer(refill).data,
            status=status.HTTP_201_CREATED,
        )


class RefillRequestCancelView(APIView):
    """Cancel a still-pending refill request owned by the patient.

    Returns 404 when the request is not owned by the patient, 400 when
    the request is already resolved (approved / denied / cancelled).
    Cancellation is patient-initiated, so ``resolved_at`` and
    ``resolved_by`` remain untouched — those track clinician resolution.
    """

    permission_classes = [IsPortalPatient]

    @extend_schema(
        request=None,
        responses=PortalRefillRequestSerializer,
        summary="Cancel a pending refill request",
    )
    def post(self, request, pk):
        patient = get_patient_for_user(request.user)
        with transaction.atomic():
            refill = (
                RefillRequest.objects.select_for_update(of=("self",))
                .filter(pk=pk, patient=patient)
                .select_related("medication", "pharmacy")
                .first()
            )
            if not refill:
                raise NotFound("Refill request not found.")
            if refill.status != RefillRequest.STATUS_PENDING:
                raise ValidationError(
                    {"status": "Only pending refill requests can be cancelled."}
                )
            refill.status = RefillRequest.STATUS_CANCELLED
            refill.save(update_fields=["status"])

        return Response(PortalRefillRequestSerializer(refill).data)


@extend_schema(
    responses=PortalPharmacySerializer(many=True),
    summary="Pharmacies the patient may select from",
)
class PortalPharmacyListView(APIView):
    """Facility-scoped, active pharmacy directory for the patient.

    Filters through :func:`get_effective_pharmacy_ids` so org-level and
    facility-level preferences (including overrides and hides) are
    honoured before the patient ever sees the directory.
    """

    permission_classes = [IsPortalPatient]

    def get(self, request):
        patient = get_patient_for_user(request.user)
        allowed_ids = get_effective_pharmacy_ids(patient.facility)
        pharmacies = (
            Pharmacy.objects.filter(id__in=allowed_ids, is_active=True)
            .select_related("address")
            .order_by("name")
        )
        return Response(PortalPharmacySerializer(pharmacies, many=True).data)
