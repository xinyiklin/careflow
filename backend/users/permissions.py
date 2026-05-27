from rest_framework.permissions import BasePermission


class IsPortalPatient(BasePermission):
    """Allow only authenticated users with an active patient portal account."""

    message = "Patient portal account required."

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        portal_account = getattr(user, "portal_account", None)
        return bool(portal_account and portal_account.is_active)
