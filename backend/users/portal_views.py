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

    @extend_schema(
        request=PortalPatientSerializer,
        responses=PortalPatientSerializer,
        summary="Update authenticated patient profile",
    )
    def patch(self, request):
        patient = get_patient_for_user(request.user)
        serializer = PortalPatientSerializer(patient, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
