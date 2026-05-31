from organizations.models import OrganizationMembership


def ensure_demo_user_is_org_owner(user):
    """Guarantee the demo account is an active organization owner.

    Owner is the break-glass role: it confers full organization access by
    virtue of the role itself, so the demo never needs hardcoded per-permission
    overrides. Facility-level access comes from the demo's seeded admin staff
    profiles, which are governed by the normal role/permission system.
    """
    try:
        membership = user.org_membership
    except OrganizationMembership.DoesNotExist:
        return None

    if membership.role != OrganizationMembership.ROLE_OWNER or not membership.is_active:
        membership.role = OrganizationMembership.ROLE_OWNER
        membership.is_active = True
        membership.save(update_fields=["role", "is_active"])

    return membership
