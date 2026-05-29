"""Surface-aware JWT helpers.

CareFlow has two disjoint auth surfaces — the clinician app and the patient
portal — that share one API host and one refresh-cookie name (isolated by
path, see ``users.views``). To stop a refresh token minted for one surface
from being replayed against the other surface's refresh endpoint, every token
carries a ``surface`` claim and the refresh endpoints reject a mismatch.
"""

from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import (
    TokenObtainPairSerializer,
    TokenRefreshSerializer,
)
from rest_framework_simplejwt.tokens import RefreshToken

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


class ClinicTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Username/password login for the clinician app."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token[SURFACE_CLAIM] = CLINIC_SURFACE
        return token


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

        return super().validate(attrs)


class ClinicTokenRefreshSerializer(_SurfaceTokenRefreshSerializer):
    expected_surface = CLINIC_SURFACE


class PortalTokenRefreshSerializer(_SurfaceTokenRefreshSerializer):
    expected_surface = PORTAL_SURFACE
