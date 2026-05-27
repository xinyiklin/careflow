from django.db.models import Case, IntegerField, Value, When
from drf_spectacular.utils import extend_schema
from rest_framework.generics import ListAPIView

from users.permissions import IsPortalPatient
from users.portal_access import get_patient_for_user

from .models import PatientAllergy
from .portal_serializers import PortalAllergySerializer

# Severity ranking: most dangerous first. Records of unknown / low
# severity slot to the bottom of the active group.
_SEVERITY_RANK = {
    PatientAllergy.SEVERITY_LIFE_THREATENING: 0,
    PatientAllergy.SEVERITY_SEVERE: 1,
    PatientAllergy.SEVERITY_MODERATE: 2,
    PatientAllergy.SEVERITY_MILD: 3,
    PatientAllergy.SEVERITY_UNKNOWN: 4,
}


@extend_schema(
    responses=PortalAllergySerializer(many=True),
    summary="Patient portal allergies",
)
class PortalAllergyListView(ListAPIView):
    """List the authenticated patient's allergies.

    Active allergies first, then non-active, ordered within each group
    by severity (most dangerous first), with allergen as a tiebreaker.
    """

    serializer_class = PortalAllergySerializer
    permission_classes = [IsPortalPatient]
    pagination_class = None

    def get_queryset(self):
        patient = get_patient_for_user(self.request.user)

        severity_cases = [
            When(severity=severity, then=Value(rank))
            for severity, rank in _SEVERITY_RANK.items()
        ]

        return (
            PatientAllergy.objects.filter(patient=patient)
            .select_related("patient")
            .annotate(
                _active_rank=Case(
                    When(is_active=True, then=Value(0)),
                    default=Value(1),
                    output_field=IntegerField(),
                ),
                _severity_rank=Case(
                    *severity_cases,
                    default=Value(len(_SEVERITY_RANK)),
                    output_field=IntegerField(),
                ),
            )
            .order_by("_active_rank", "_severity_rank", "allergen")
        )
