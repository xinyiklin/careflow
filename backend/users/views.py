from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import JsonResponse
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import UserPreference
from .serializers import RegisterSerializer, UserPreferenceSerializer, UserSerializer

REFRESH_COOKIE_NAME = "careflow_refresh"
REFRESH_COOKIE_PATH = "/v1/users/"


def set_refresh_cookie(response, refresh_token):
    if not refresh_token:
        return response

    response.set_cookie(
        REFRESH_COOKIE_NAME,
        refresh_token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="None" if not settings.DEBUG else "Lax",
        path=REFRESH_COOKIE_PATH,
        max_age=14 * 24 * 60 * 60,
    )
    return response


def clear_refresh_cookie(response):
    response.delete_cookie(
        REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
        secure=not settings.DEBUG,
        samesite="None" if not settings.DEBUG else "Lax",
    )
    return response


def health_check(request):
    return JsonResponse({"status": "ok"})


class CookieTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        refresh_token = response.data.pop("refresh", None)
        return set_refresh_cookie(response, refresh_token)


class CookieTokenRefreshView(TokenRefreshView):
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
        return set_refresh_cookie(response, refresh_token)


class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        response = Response(status=status.HTTP_204_NO_CONTENT)
        return clear_refresh_cookie(response)


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


class DemoLoginView(APIView):
    permission_classes = [permissions.AllowAny]

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

        refresh = RefreshToken.for_user(user)

        response = Response(
            {
                "access": str(refresh.access_token),
                "is_demo": True,
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )
        return set_refresh_cookie(response, str(refresh))
