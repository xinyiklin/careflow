from drf_spectacular.utils import extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsPortalPatient
from users.portal_access import get_patient_for_user
from users.portal_serializers import PortalPatientSerializer


class PortalMeView(APIView):
    """Return the authenticated patient's own profile."""

    permission_classes = [IsPortalPatient]

    @extend_schema(
        responses=PortalPatientSerializer,
        summary="Authenticated patient profile",
    )
    def get(self, request):
        patient = get_patient_for_user(request.user)
        return Response(PortalPatientSerializer(patient).data)
