from django.db.models import F
from rest_framework.exceptions import PermissionDenied

from organizations.permissions import (
    get_user_organization_membership,
    is_org_admin,
    is_org_owner,
)

from .models import Facility, Staff
from .security import holds_all_self_management, user_has_facility_permission


def lock_facility_security_staff(facility):
    """Lock the facility's active staff rows for a security mutation.

    Read-modify-write of the role/override permission maps is otherwise
    last-write-wins: two admins editing concurrently could each pass the
    self-management coverage check and together strip the final administrator.
    Locking the active staff rows serializes those mutations so the coverage
    check and the save see a consistent, committed view. Must run inside a
    transaction.
    """
    return list(
        Staff.objects.select_for_update(of=("self",))
        .filter(facility=facility, is_active=True)
        .select_related("role")
    )


def validate_staff_security_transition(
    *,
    actor,
    facility,
    staff,
    prospective_role,
    prospective_overrides,
    prospective_is_active,
):
    """Lock and validate one staff security-state transition.

    Callers remain responsible for authorization. This shared invariant protects
    the current actor from removing their own facility administration and keeps
    a facility from losing its final administrator, regardless of whether the
    transition originates from a facility or organization-admin endpoint.
    Must run inside ``transaction.atomic()``.
    """
    facility_staff = lock_facility_security_staff(facility)
    locked_staff_by_id = {item.id: item for item in facility_staff}
    locked_staff = locked_staff_by_id.get(staff.id)
    if locked_staff is None:
        locked_staff = (
            Staff.objects.select_for_update(of=("self",))
            .select_related("role")
            .get(pk=staff.pk)
        )
        facility_staff.append(locked_staff)

    prospective_role_permissions = (
        prospective_role.security_permissions if prospective_role else {}
    )
    if locked_staff.user_id == actor.id and (
        not prospective_is_active
        or not holds_all_self_management(
            prospective_role_permissions,
            prospective_overrides,
        )
    ):
        raise PermissionDenied(
            "You cannot remove your own administrative or security "
            "management access. This would lock you out."
        )

    def holds_admin_after(candidate):
        if candidate.id == locked_staff.id:
            if not prospective_is_active:
                return False
            return holds_all_self_management(
                prospective_role_permissions,
                prospective_overrides,
            )
        if not candidate.is_active:
            return False
        return holds_all_self_management(
            candidate.role.security_permissions if candidate.role else {},
            candidate.security_overrides,
        )

    had_admin = any(
        candidate.is_active
        and holds_all_self_management(
            candidate.role.security_permissions if candidate.role else {},
            candidate.security_overrides,
        )
        for candidate in facility_staff
    )
    if had_admin and not any(
        holds_admin_after(candidate) for candidate in facility_staff
    ):
        raise PermissionDenied(
            "This change would leave the facility without an administrator. "
            "Assign another administrator first."
        )

    return locked_staff


def get_default_staff_profile(user):
    if not user or not user.is_authenticated:
        return None

    memberships = list(
        Staff.objects.filter(
            user=user,
            is_active=True,
            facility__is_active=True,
            role__is_active=True,
            user__org_membership__is_active=True,
            facility__organization_id=F("user__org_membership__organization_id"),
        )
        .select_related("facility", "role", "title")
        .order_by("-is_default", "facility__name", "facility_id")
    )

    if len(memberships) == 1:
        return memberships[0]

    preference_record = getattr(user, "preference_record", None)
    preferences = getattr(preference_record, "preferences", {}) or {}
    preferred_facility_id = preferences.get("lastFacilityId") or preferences.get(
        "defaultFacilityId"
    )
    if preferred_facility_id:
        preferred_memberships = [
            m for m in memberships if str(m.facility_id) == str(preferred_facility_id)
        ]
        if len(preferred_memberships) == 1:
            return preferred_memberships[0]

    default_memberships = [m for m in memberships if m.is_default]
    if len(default_memberships) == 1:
        return default_memberships[0]

    return memberships[0] if memberships else None


def get_staff_profile_for_facility(user, facility_id):
    if not user or not user.is_authenticated or not facility_id:
        return None

    return (
        Staff.objects.filter(
            user=user,
            facility_id=facility_id,
            is_active=True,
            facility__is_active=True,
            role__is_active=True,
            user__org_membership__is_active=True,
            facility__organization_id=F("user__org_membership__organization_id"),
        )
        .select_related("facility", "role", "title")
        .first()
    )


def user_can_access_facility(user, facility_id):
    if not user or not user.is_authenticated or not facility_id:
        return False

    if get_staff_profile_for_facility(user, facility_id):
        return True

    if is_org_admin(user):
        org_membership = get_user_organization_membership(user)
        return Facility.objects.filter(
            id=facility_id,
            organization_id=org_membership.organization_id,
            is_active=True,
        ).exists()

    return False


def user_can_admin_facility(user, facility_id):
    if not user or not user.is_authenticated or not facility_id:
        return False

    if is_org_admin(user):
        org_membership = get_user_organization_membership(user)
        return Facility.objects.filter(
            id=facility_id,
            organization_id=org_membership.organization_id,
            is_active=True,
        ).exists()

    staff_profile = get_staff_profile_for_facility(user, facility_id)
    if not staff_profile or not staff_profile.role:
        return False

    return staff_profile.role.code == "admin"


def user_can_manage_facility_security(user, facility_id):
    """Whether the user may edit facility security permissions/overrides.

    Mirrors the organization-level model: the org owner (and superusers) are
    break-glass and always qualify, so security can never be locked out. Every
    other role — including facility admins — must hold the effective
    ``admin.security.manage`` permission rather than merely ``admin.facility.manage``.
    """
    if not user or not user.is_authenticated or not facility_id:
        return False

    if user.is_superuser or is_org_owner(user):
        return True

    return user_has_facility_permission(user, facility_id, "admin.security.manage")


def get_facility_for_user(user, facility_id=None):
    if facility_id:
        if not user_can_access_facility(user, facility_id):
            raise PermissionDenied("You do not have access to this facility.")

        return Facility.objects.get(id=facility_id, is_active=True)

    if is_org_admin(user):
        org_membership = get_user_organization_membership(user)
        facility = (
            Facility.objects.filter(
                organization_id=org_membership.organization_id,
                is_active=True,
            )
            .order_by("name")
            .first()
        )
        if not facility:
            raise PermissionDenied(
                "No active facilities available in this organization."
            )
        return facility

    profile = get_default_staff_profile(user)
    if not profile:
        raise PermissionDenied(
            "No active default facility found. If the user has multiple facilities, one must be default."
        )

    return profile.facility
