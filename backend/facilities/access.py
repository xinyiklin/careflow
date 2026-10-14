from django.db.models import Exists, F, OuterRef
from rest_framework.exceptions import PermissionDenied

from organizations.models import OrganizationMembership
from organizations.permissions import (
    get_user_organization_membership,
    is_org_admin,
    is_org_owner,
)

from .models import Facility, Staff, StaffRole
from .security import holds_effective_self_management, user_has_facility_permission


def lock_facility_roles(facility):
    """Lock a facility's role rows in a stable order. Must run in a transaction.

    FOR NO KEY UPDATE serializes role edits and security checks without
    blocking the key-share locks Postgres takes when a staff row references a
    role, so staff inserts elsewhere in an open transaction cannot deadlock it.
    """
    list(
        StaffRole.objects.select_for_update(no_key=True)
        .filter(facility=facility)
        .order_by("pk")
    )


def lock_organization_memberships(organization_id):
    """Lock an organization's membership rows in a stable order.

    Membership state decides whether a staff row grants facility access, so
    facility security checks and organization people updates both take these
    locks first (memberships, then roles, then staff). Must run in a
    transaction.
    """
    list(
        OrganizationMembership.objects.select_for_update()
        .filter(organization_id=organization_id)
        .order_by("pk")
    )


def _security_staff_queryset(facility):
    """Locking staff queryset annotated with the access-granting membership."""
    return (
        Staff.objects.select_for_update(of=("self",))
        .select_related("role")
        .annotate(
            has_active_membership=Exists(
                OrganizationMembership.objects.filter(
                    user_id=OuterRef("user_id"),
                    organization_id=facility.organization_id,
                    is_active=True,
                )
            )
        )
    )


def holds_facility_administration(staff, role, security_overrides, **role_state):
    """Whether ``staff`` counts as a facility administrator.

    The single definition shared by every coverage guard, mirroring how
    ``user_has_facility_permission`` resolves access: an active organization
    membership in the facility's organization, an active role, and effective
    ``admin.facility.manage`` and ``admin.security.manage``. The role code is
    irrelevant. ``staff`` must come from ``lock_facility_security_staff`` (or
    ``validate_staff_security_transition``); the caller checks the staff row's
    own active state, and an inactive facility has no administrators (see
    ``validate_staff_security_transition``). ``role_state`` evaluates a
    prospective role state.
    """
    return staff.has_active_membership and holds_effective_self_management(
        role, security_overrides, **role_state
    )


def lock_facility_security_staff(facility):
    """Lock the facility's active staff rows for a security mutation.

    Read-modify-write of the role/override permission maps is otherwise
    last-write-wins: two admins editing concurrently could each pass the
    self-management coverage check and together strip the final administrator.
    Locking the active staff rows serializes those mutations so the coverage
    check and the save see a consistent, committed view. The organization's
    memberships and the facility's role rows are locked first so a concurrent
    membership or role edit is committed before the staff rows, their roles,
    and their membership state are read. Rows carry ``has_active_membership``
    for ``holds_facility_administration``. Must run inside a transaction.
    """
    lock_organization_memberships(facility.organization_id)
    lock_facility_roles(facility)
    return list(
        _security_staff_queryset(facility).filter(facility=facility, is_active=True)
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
        locked_staff = _security_staff_queryset(facility).get(pk=staff.pk)
        facility_staff.append(locked_staff)
    if prospective_role is not None:
        # Re-read under the role lock; the caller's copy may predate a
        # concurrent deactivation.
        prospective_role = StaffRole.objects.get(pk=prospective_role.pk)

    # An inactive facility grants no access, so it has no administrators to
    # cover or lock out. Re-read: the caller's copy may predate a change.
    if not Facility.objects.filter(pk=facility.pk, is_active=True).exists():
        return locked_staff

    if locked_staff.user_id == actor.id and (
        not prospective_is_active
        or not holds_facility_administration(
            locked_staff, prospective_role, prospective_overrides
        )
    ):
        raise PermissionDenied(
            "You cannot remove your own administrative or security "
            "management access. This would lock you out."
        )

    def holds_admin_after(candidate):
        if candidate.id == locked_staff.id:
            return prospective_is_active and holds_facility_administration(
                candidate, prospective_role, prospective_overrides
            )
        return candidate.is_active and holds_facility_administration(
            candidate, candidate.role, candidate.security_overrides
        )

    had_admin = any(
        candidate.is_active
        and holds_facility_administration(
            candidate, candidate.role, candidate.security_overrides
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

    # Facility staff qualify by effective permission, never by role code.
    return user_has_facility_permission(user, facility_id, "admin.facility.manage")


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
