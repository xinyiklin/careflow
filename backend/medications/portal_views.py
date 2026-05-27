from django.db.models import Case, IntegerField, Value, When
from drf_spectacular.utils import extend_schema
from rest_framework.generics import ListAPIView

from users.permissions import IsPortalPatient
from users.portal_access import get_patient_for_user

from .models import Medication
from .portal_serializers import PortalMedicationSerializer


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
