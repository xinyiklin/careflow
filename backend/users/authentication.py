from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from .identity import has_active_clinic_identity, has_active_portal_identity
from .tokens import CLINIC_SURFACE, PORTAL_SURFACE, SURFACE_CLAIM

AUTHENTICATION_EXEMPT_PATHS = {
    "/v1/users/token/",
    "/v1/users/token/refresh/",
    "/v1/users/logout/",
    "/v1/users/demo-login/",
    "/v1/users/register/",
    "/v1/portal/auth/login/",
    "/v1/portal/auth/refresh/",
    "/v1/portal/auth/logout/",
    "/v1/portal/demo-login/",
}


def _expected_surface(request):
    return (
        PORTAL_SURFACE
        if request.path_info.startswith("/v1/portal/")
        else CLINIC_SURFACE
    )


def _validate_surface_identity(user, expected_surface):
    identity_is_active = (
        has_active_portal_identity(user)
        if expected_surface == PORTAL_SURFACE
        else has_active_clinic_identity(user)
    )
    if not identity_is_active:
        raise AuthenticationFailed("Account access is no longer active.")


class SurfaceJWTAuthentication(JWTAuthentication):
    """Authenticate access tokens only on their intended CareFlow surface."""

    def authenticate(self, request):
        if request.path_info in AUTHENTICATION_EXEMPT_PATHS:
            return None
        result = super().authenticate(request)
        if result is None:
            return None

        user, validated_token = result
        expected_surface = _expected_surface(request)
        if validated_token.get(SURFACE_CLAIM) != expected_surface:
            raise AuthenticationFailed("Token is not valid for this surface.")

        _validate_surface_identity(user, expected_surface)

        return user, validated_token


class SurfaceSessionAuthentication(SessionAuthentication):
    """Apply the same identity boundary to Django session-authenticated APIs."""

    def authenticate(self, request):
        if request.path_info in AUTHENTICATION_EXEMPT_PATHS:
            return None
        result = super().authenticate(request)
        if result is None:
            return None

        user, auth = result
        _validate_surface_identity(user, _expected_surface(request))
        return user, auth


class SurfaceJWTAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = SurfaceJWTAuthentication
    name = "jwtAuth"

    def get_security_definition(self, auto_schema):
        return {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }


class SurfaceSessionAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = SurfaceSessionAuthentication
    name = "cookieAuth"

    def get_security_definition(self, auto_schema):
        return {
            "type": "apiKey",
            "in": "cookie",
            "name": "sessionid",
        }
