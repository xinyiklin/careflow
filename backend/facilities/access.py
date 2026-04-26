from rest_framework.exceptions import PermissionDenied

from organizations.permissions import get_user_organization_membership, is_org_admin

from .models import Facility, Staff


def get_default_staff_profile(user):
    if not user or not user.is_authenticated:
        return None

    memberships = list(
        Staff.objects.filter(user=user, is_active=True)
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
