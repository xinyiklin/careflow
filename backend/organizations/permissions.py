from .models import OrganizationMembership


def get_user_organization_membership(user):
    if not user or not user.is_authenticated:
        return None

    membership = getattr(user, "org_membership", None)
    if membership and membership.is_active:
        return membership

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
