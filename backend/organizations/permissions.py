from .models import OrganizationMembership
from .security import get_effective_org_permissions


def get_user_organization_membership(user):
    if not user or not user.is_authenticated:
        return None

    return (
        OrganizationMembership.objects.filter(user=user, is_active=True)
        .select_related("organization")
        .first()
    )


def is_org_admin(user):
    membership = get_user_organization_membership(user)
    if not membership:
        return False

    return membership.role in [
        OrganizationMembership.ROLE_OWNER,
        OrganizationMembership.ROLE_ADMIN,
    ]


def is_org_owner(user):
    membership = get_user_organization_membership(user)
    if not membership:
        return False

    return membership.role == OrganizationMembership.ROLE_OWNER


def can_manage_org_security(user):
    """Return the user's membership if they may manage organization security.

    Owners and superusers are break-glass: they always qualify, regardless of
    stored permissions, so the organization can never be locked out of its own
    security settings. Every other role must hold the effective
    ``org.security.manage`` permission, so an admin can be governed by — rather
    than bypass — the permission system.
    """
    membership = get_user_organization_membership(user)
    if not membership:
        return None

    if user.is_superuser or membership.role == OrganizationMembership.ROLE_OWNER:
        return membership

    effective = get_effective_org_permissions(membership)
    if effective.get("org.security.manage", False):
        return membership

    return None
