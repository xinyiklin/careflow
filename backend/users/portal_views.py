from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.views import TokenRefreshView

from medications.portal_serializers import PortalPreferredPharmacyUpdateSerializer
from patients.models import PatientPharmacy, Pharmacy
from patients.pharmacy_access import facility_can_use_pharmacy
from users.permissions import IsPortalPatient
from users.portal import PatientPortalAccount
from users.portal_access import get_patient_for_user
from users.portal_serializers import PortalPatientSerializer
from users.tokens import (
    PORTAL_SURFACE,
    PortalTokenRefreshSerializer,
    issue_refresh_for_user,
)
from users.views import (
    PORTAL_REFRESH_COOKIE_PATH,
    REFRESH_COOKIE_NAME,
    blacklist_refresh_cookie,
    clear_refresh_cookie,
    set_refresh_cookie,
)


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


class PortalPreferredPharmacyView(APIView):
    """Update or clear the requesting patient's preferred pharmacy.

    Setting a value upserts a :class:`PatientPharmacy` row marked default
    + active for the patient; the model's ``save`` syncs
    :attr:`Patient.preferred_pharmacy` as a side effect so the two
    representations never diverge.

    Clearing (``pharmacy_id=null``) demotes any existing default
    :class:`PatientPharmacy` rows and clears
    :attr:`Patient.preferred_pharmacy` directly.
    """

    permission_classes = [IsPortalPatient]

    @extend_schema(
        request=PortalPreferredPharmacyUpdateSerializer,
        responses={
            200: PortalPreferredPharmacyUpdateSerializer,
        },
        summary="Update authenticated patient's preferred pharmacy",
    )
    def patch(self, request):
        patient = get_patient_for_user(request.user)
        serializer = PortalPreferredPharmacyUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        pharmacy_id = serializer.validated_data["pharmacy_id"]
        pharmacy = None
        if pharmacy_id is not None:
            pharmacy = Pharmacy.objects.filter(pk=pharmacy_id, is_active=True).first()
            if not pharmacy or not facility_can_use_pharmacy(
                patient.facility, pharmacy
            ):
                raise PermissionDenied("Pharmacy is not available at your facility.")

        with transaction.atomic():
            if pharmacy is None:
                PatientPharmacy.objects.filter(
                    patient=patient,
                    is_default=True,
                    is_active=True,
                ).update(is_default=False)
                patient.preferred_pharmacy = None
                patient.save(update_fields=["preferred_pharmacy"])
            else:
                existing = PatientPharmacy.objects.filter(
                    patient=patient, pharmacy=pharmacy
                ).first()
                if existing:
                    existing.is_default = True
                    existing.is_active = True
                    existing.save()
                else:
                    PatientPharmacy.objects.create(
                        patient=patient,
                        pharmacy=pharmacy,
                        is_default=True,
                        is_active=True,
                    )
                # ``PatientPharmacy.save`` synced preferred_pharmacy via
                # an UPDATE; refresh so the response reflects it.
                patient.refresh_from_db(fields=["preferred_pharmacy"])

        return Response(
            {
                "pharmacy_id": patient.preferred_pharmacy_id,
                "pharmacy_name": (
                    patient.preferred_pharmacy.name
                    if patient.preferred_pharmacy
                    else ""
                ),
            }
        )


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

        refresh = issue_refresh_for_user(user, PORTAL_SURFACE)
        response = Response(
            {"access": str(refresh.access_token), "is_demo": True},
            status=status.HTTP_200_OK,
        )
        return set_refresh_cookie(
            response, str(refresh), path=PORTAL_REFRESH_COOKIE_PATH
        )


@method_decorator(csrf_protect, name="dispatch")
class PortalTokenRefreshView(TokenRefreshView):
    """Refresh a portal session token using the portal-path refresh cookie.

    Mirrors :class:`users.views.CookieTokenRefreshView` but reads and writes
    the cookie at :data:`users.views.PORTAL_REFRESH_COOKIE_PATH` so the
    browser keeps clinic and portal sessions isolated even on a shared host.
    The serializer also rejects a refresh token minted for the clinician
    surface, so a clinic token can't be replayed here to mint portal access.
    """

    serializer_class = PortalTokenRefreshSerializer

    def post(self, request, *args, **kwargs):
        data = (
            request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        )
        if not data.get("refresh"):
            data["refresh"] = request.COOKIES.get(REFRESH_COOKIE_NAME, "")

        serializer = self.get_serializer(data=data)

        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as exc:
            raise InvalidToken(exc.args[0]) from exc

        response = Response(serializer.validated_data, status=status.HTTP_200_OK)
        refresh_token = response.data.pop("refresh", None)
        return set_refresh_cookie(
            response, refresh_token, path=PORTAL_REFRESH_COOKIE_PATH
        )


@method_decorator(csrf_protect, name="dispatch")
class PortalLogoutView(APIView):
    """Revoke and clear the portal-scoped refresh cookie."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        blacklist_refresh_cookie(request)
        response = Response(status=status.HTTP_204_NO_CONTENT)
        return clear_refresh_cookie(response, path=PORTAL_REFRESH_COOKIE_PATH)
