from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied

from organizations.permissions import is_org_admin

from .access import (
    get_facility_for_user,
    user_can_access_facility,
    user_can_admin_facility,
)
from .security import user_has_facility_permission


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


class IsOrgAdminOrFacilityAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if is_org_admin(request.user):
            return True

        if request.method in permissions.SAFE_METHODS:
            return True

        if request.method in ["PUT", "PATCH"]:
            facility_id = view.kwargs.get("pk") or request.query_params.get(
                "facility_id"
            )
            if not facility_id:
                try:
                    facility = get_facility_for_user(request.user, None)
                    facility_id = facility.id
                except DRFPermissionDenied:
                    return False

            return user_can_admin_facility(
                request.user,
                facility_id,
            ) and user_has_facility_permission(
                request.user,
                facility_id,
                "admin.facility.manage",
            )

        return False

    def has_object_permission(self, request, view, obj):
        if is_org_admin(request.user):
            return True

        if request.method in permissions.SAFE_METHODS:
            return user_can_access_facility(request.user, obj.id)

        if request.method in ["PUT", "PATCH"]:
            return user_can_admin_facility(
                request.user,
                obj.id,
            ) and user_has_facility_permission(
                request.user,
                obj.id,
                "admin.facility.manage",
            )

        return False
