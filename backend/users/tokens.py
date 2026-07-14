"""Surface-aware JWT helpers.

CareFlow has two disjoint auth surfaces — the clinician app and the patient
portal — that share one API host and one refresh-cookie name (isolated by
path, see ``users.views``). To stop a refresh token minted for one surface
from being replayed against the other surface's refresh endpoint, every token
carries a ``surface`` claim and the refresh endpoints reject a mismatch.
"""

from django.contrib.auth import get_user_model
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import (
    TokenObtainPairSerializer,
    TokenRefreshSerializer,
)
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken

from .identity import has_active_clinic_identity, has_active_portal_identity

SURFACE_CLAIM = "surface"
CLINIC_SURFACE = "clinic"
PORTAL_SURFACE = "portal"


def issue_refresh_for_user(user, surface):
    """Mint a refresh token (and, via it, an access token) tagged with surface.

    Used by the demo-login views, which build tokens directly instead of going
    through ``TokenObtainPairSerializer``.
    """
    refresh = RefreshToken.for_user(user)
    refresh[SURFACE_CLAIM] = surface
    return refresh


def _token_has_active_identity(token, surface):
    user_id = token.get(api_settings.USER_ID_CLAIM)
    if user_id is None:
        return False

    User = get_user_model()
    try:
        user = User.objects.get(**{api_settings.USER_ID_FIELD: user_id})
    except User.DoesNotExist:
        return False

    if surface == PORTAL_SURFACE:
        return has_active_portal_identity(user)
    return has_active_clinic_identity(user)


class ClinicTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Username/password login for the clinician app."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token[SURFACE_CLAIM] = CLINIC_SURFACE
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        if not has_active_clinic_identity(self.user):
            raise AuthenticationFailed(
                "This account doesn't have active clinician access."
            )
        return data


class PortalTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Username/password login for the patient portal.

    Tags the token with the portal surface and rejects users without an
    active portal account, so a clinician credential cannot mint a portal
    session even if it reaches this endpoint.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token[SURFACE_CLAIM] = PORTAL_SURFACE
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        if not has_active_portal_identity(self.user):
            raise AuthenticationFailed(
                "This account doesn't have patient portal access."
            )
        return data


class _SurfaceTokenRefreshSerializer(TokenRefreshSerializer):
    """Reject a refresh token whose ``surface`` claim doesn't match the view."""

    expected_surface = None

    def validate(self, attrs):
        try:
            token = self.token_class(attrs["refresh"])
        except TokenError as exc:
            raise InvalidToken(exc.args[0]) from exc

        if token.get(SURFACE_CLAIM) != self.expected_surface:
            raise InvalidToken("Refresh token is not valid for this surface.")

        if not _token_has_active_identity(token, self.expected_surface):
            raise InvalidToken("Account access is no longer active.")

        return super().validate(attrs)


class ClinicTokenRefreshSerializer(_SurfaceTokenRefreshSerializer):
    expected_surface = CLINIC_SURFACE


class PortalTokenRefreshSerializer(_SurfaceTokenRefreshSerializer):
    expected_surface = PORTAL_SURFACE
