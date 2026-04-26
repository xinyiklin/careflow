from rest_framework import permissions

from organizations.permissions import is_org_admin

from .access import get_facility_for_user, user_can_admin_facility
from .security import user_has_facility_permission


class IsOrgAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and is_org_admin(request.user)
        )


class IsFacilityAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        facility_id = request.query_params.get("facility_id")

        if not facility_id:
            facility = get_facility_for_user(request.user, None)
            facility_id = facility.id

        return user_can_admin_facility(
            request.user,
            facility_id,
        ) and user_has_facility_permission(
            request.user,
            facility_id,
            "admin.facility.manage",
        )
