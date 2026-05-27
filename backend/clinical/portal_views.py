"""Patient portal endpoint exposing a consolidated medical summary."""

from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework.response import Response
from rest_framework.views import APIView

from allergies.models import PatientAllergy
from medications.models import Medication
from users.permissions import IsPortalPatient
from users.portal_access import get_patient_for_user

from .models import Encounter
from .portal_serializers import (
    PortalEncounterSummarySerializer,
    PortalMedicalSummaryAllergySerializer,
    PortalMedicalSummaryMedicationSerializer,
)


class PortalMedicalSummaryView(APIView):
    """Return the patient's signed visits with vitals + active meds + allergies.

    Drafts and in-progress encounters are intentionally hidden: patients see
    only finalized (signed) clinical records, matching the existing
    sign-off / lock contract.
    """

    permission_classes = [IsPortalPatient]

    @extend_schema(
        responses=inline_serializer(
            name="PortalMedicalSummary",
            fields={
                "active_medications": PortalMedicalSummaryMedicationSerializer(
                    many=True
                ),
                "active_allergies": PortalMedicalSummaryAllergySerializer(many=True),
                "visits": PortalEncounterSummarySerializer(many=True),
            },
        ),
        summary="Authenticated patient's medical summary",
    )
    def get(self, request):
        patient = get_patient_for_user(request.user)

        encounters = (
            Encounter.objects.filter(
                patient=patient,
                status=Encounter.STATUS_SIGNED,
                progress_note__status="signed",
            )
            .select_related("facility", "progress_note", "vitals")
            .order_by("-started_at", "-id")
        )

        active_medications = Medication.objects.filter(
            patient=patient,
            status=Medication.STATUS_ACTIVE,
        ).order_by("medication_name", "-start_date", "-created_at")

        active_allergies = PatientAllergy.objects.filter(
            patient=patient,
            status=PatientAllergy.STATUS_ACTIVE,
        ).order_by("allergen")

        payload = {
            "active_medications": PortalMedicalSummaryMedicationSerializer(
                active_medications, many=True
            ).data,
            "active_allergies": PortalMedicalSummaryAllergySerializer(
                active_allergies, many=True
            ).data,
            "visits": PortalEncounterSummarySerializer(encounters, many=True).data,
        }
        return Response(payload)
