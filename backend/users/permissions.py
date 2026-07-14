from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission

from .portal_access import get_patient_for_user


class IsPortalPatient(BasePermission):
    """Allow only authenticated users with an active patient portal account."""

    message = "Patient portal account required."

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        try:
            get_patient_for_user(user)
        except PermissionDenied:
            return False
        return True
