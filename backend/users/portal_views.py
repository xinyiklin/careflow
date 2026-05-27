from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from users.permissions import IsPortalPatient
from users.portal import PatientPortalAccount
from users.portal_access import get_patient_for_user
from users.portal_serializers import PortalPatientSerializer
from users.views import set_refresh_cookie


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


@method_decorator(csrf_protect, name="dispatch")
class PortalDemoLoginView(APIView):
    """Issue a JWT for the seeded demo patient account.

    Only enabled when ``DEMO_MODE=true``; returns 403 otherwise. The demo
    user must already exist (created by ``seed_demo``) and must have an
    active :class:`PatientPortalAccount`. Refresh cookie matches the path
    used by the standard token-refresh flow.
    """

    permission_classes = [permissions.AllowAny]

    @extend_schema(
        responses={200: None, 403: None, 500: None},
        summary="Sign in as the seeded demo patient",
    )
    def post(self, request):
        if not getattr(settings, "DEMO_MODE", False):
            return Response(
                {"detail": "Demo mode is disabled."},
                status=status.HTTP_403_FORBIDDEN,
            )

        username = getattr(settings, "PORTAL_DEMO_USERNAME", "patient_demo")
        User = get_user_model()
        user = User.objects.filter(username=username, is_active=True).first()

        if not user:
            return Response(
                {"detail": "Demo patient not found."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if not PatientPortalAccount.objects.filter(user=user, is_active=True).exists():
            return Response(
                {"detail": "Demo user is not linked to a portal account."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        refresh = RefreshToken.for_user(user)
        response = Response(
            {"access": str(refresh.access_token), "is_demo": True},
            status=status.HTTP_200_OK,
        )
        return set_refresh_cookie(response, str(refresh))
