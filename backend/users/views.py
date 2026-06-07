from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .demo_access import ensure_demo_user_is_org_owner
from .models import UserPreference
from .serializers import RegisterSerializer, UserPreferenceSerializer, UserSerializer
from .tokens import (
    CLINIC_SURFACE,
    ClinicTokenObtainPairSerializer,
    ClinicTokenRefreshSerializer,
    issue_refresh_for_user,
)

REFRESH_COOKIE_NAME = "careflow_refresh"
# Clinician app cookies are scoped so the browser only sends them to
# /v1/users/* requests; the patient portal uses its own path below.
CLINIC_REFRESH_COOKIE_PATH = "/v1/users/"
PORTAL_REFRESH_COOKIE_PATH = "/v1/portal/"


def set_refresh_cookie(response, refresh_token, *, path):
    if not refresh_token:
        return response

    response.set_cookie(
        REFRESH_COOKIE_NAME,
        refresh_token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="None" if not settings.DEBUG else "Lax",
        path=path,
        max_age=14 * 24 * 60 * 60,
    )
    return response


def clear_refresh_cookie(response, *, path):
    response.delete_cookie(
        REFRESH_COOKIE_NAME,
        path=path,
        samesite="None" if not settings.DEBUG else "Lax",
    )
    return response


def blacklist_refresh_cookie(request):
    """Revoke the refresh token in the request's cookie, if any.

    Best-effort: a missing, expired, or malformed token simply means there is
    nothing to revoke. Used on logout so a captured refresh token can't keep
    minting access tokens after the user signs out.
    """
    raw_token = request.COOKIES.get(REFRESH_COOKIE_NAME)
    if not raw_token:
        return
    try:
        RefreshToken(raw_token).blacklist()
    except TokenError:
        pass


def health_check(request):
    return JsonResponse({"status": "ok"})


@ensure_csrf_cookie
def csrf_token(request):
    return JsonResponse({"csrfToken": get_token(request)})


@method_decorator(csrf_protect, name="dispatch")
class CookieTokenObtainPairView(TokenObtainPairView):
    serializer_class = ClinicTokenObtainPairSerializer
    throttle_scope = "login"

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        refresh_token = response.data.pop("refresh", None)
        return set_refresh_cookie(
            response, refresh_token, path=CLINIC_REFRESH_COOKIE_PATH
        )


@method_decorator(csrf_protect, name="dispatch")
class CookieTokenRefreshView(TokenRefreshView):
    serializer_class = ClinicTokenRefreshSerializer
    throttle_scope = "refresh"

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
            response, refresh_token, path=CLINIC_REFRESH_COOKIE_PATH
        )


@method_decorator(csrf_protect, name="dispatch")
class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        blacklist_refresh_cookie(request)
        response = Response(status=status.HTTP_204_NO_CONTENT)
        return clear_refresh_cookie(response, path=CLINIC_REFRESH_COOKIE_PATH)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if not getattr(settings, "ALLOW_PUBLIC_REGISTRATION", False):
            return Response(
                {"detail": "Public registration is disabled."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class UserPreferenceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        preference_record, _ = UserPreference.objects.get_or_create(user=request.user)
        serializer = UserPreferenceSerializer(
            preference_record,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


@method_decorator(csrf_protect, name="dispatch")
class DemoLoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "demo"

    def post(self, request):
        if not getattr(settings, "DEMO_MODE", False):
            return Response(
                {"detail": "Demo mode is disabled."},
                status=status.HTTP_403_FORBIDDEN,
            )

        username = getattr(settings, "DEMO_USERNAME")
        User = get_user_model()
        user = User.objects.filter(username=username, is_active=True).first()

        if not user:
            return Response(
                {"detail": "Demo user not found."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        ensure_demo_user_is_org_owner(user)

        refresh = issue_refresh_for_user(user, CLINIC_SURFACE)

        response = Response(
            {
                "access": str(refresh.access_token),
                "is_demo": True,
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )
        return set_refresh_cookie(
            response, str(refresh), path=CLINIC_REFRESH_COOKIE_PATH
        )
