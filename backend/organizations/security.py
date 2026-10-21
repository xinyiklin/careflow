ORGANIZATION_SECURITY_PERMISSIONS = [
    "org.profile.view",
    "org.profile.update",
    "org.facilities.view",
    "org.facilities.manage",
    "org.users.view",
    "org.users.manage",
    "org.payers.manage",
    "org.pharmacies.manage",
    "org.fee_schedules.manage",
    "org.audit.view",
    "org.security.manage",
]

# Display names for the system roles every organization carries; used to
# self-heal a missing ``OrganizationRole`` row (organizations created after
# the seed migration have none).
ORG_SYSTEM_ROLE_NAMES = {"owner": "Owner", "admin": "Admin", "member": "Member"}

ORG_ROLE_SECURITY_TEMPLATES = {
    "owner": {
        "org.profile.view": True,
        "org.profile.update": True,
        "org.facilities.view": True,
        "org.facilities.manage": True,
        "org.users.view": True,
        "org.users.manage": True,
        "org.payers.manage": True,
        "org.pharmacies.manage": True,
        "org.fee_schedules.manage": True,
        "org.audit.view": True,
        "org.security.manage": True,
    },
    "admin": {
        "org.profile.view": True,
        "org.profile.update": True,
        "org.facilities.view": True,
        "org.facilities.manage": True,
        "org.users.view": True,
        "org.users.manage": True,
        "org.payers.manage": True,
        "org.pharmacies.manage": True,
        "org.fee_schedules.manage": True,
        "org.audit.view": True,
        "org.security.manage": True,
    },
    "member": {
        "org.profile.view": True,
        "org.profile.update": False,
        "org.facilities.view": True,
        "org.facilities.manage": False,
        "org.users.view": True,
        "org.users.manage": False,
        "org.payers.manage": False,
        "org.pharmacies.manage": False,
        "org.fee_schedules.manage": False,
        "org.audit.view": False,
        "org.security.manage": False,
    },
}


def normalize_org_security_permissions(value):
    source = value if isinstance(value, dict) else {}
    return {
        permission: bool(source.get(permission, False))
        for permission in ORGANIZATION_SECURITY_PERMISSIONS
    }


def get_org_role_security_template(role):
    # Exact match only. Role codes are compared exactly everywhere else (role
    # rows, owner checks), so a case variant such as "Admin" must not resolve
    # to the admin template and bypass an owner's edits to the admin role.
    return normalize_org_security_permissions(
        ORG_ROLE_SECURITY_TEMPLATES.get(str(role or ""), {})
    )


def resolve_org_role_permissions(organization_id, role_code):
    """Permissions a member holding ``role_code`` gets from the role itself:
    the organization's active ``OrganizationRole`` row (the map the security
    panel edits), else the built-in template for a system code."""
    from .models import OrganizationRole

    role = (
        OrganizationRole.objects.filter(
            organization_id=organization_id,
            code=role_code,
            is_active=True,
        )
        .only("security_permissions")
        .first()
    )
    perms = (role.security_permissions if role else None) or {}
    if not perms:
        perms = get_org_role_security_template(role_code)
    return normalize_org_security_permissions(perms)


def role_grants_security_management(organization_id, role_code):
    """Whether assigning ``role_code`` hands out ``org.security.manage``."""
    return resolve_org_role_permissions(organization_id, role_code).get(
        "org.security.manage", False
    )


def get_effective_org_permissions(membership):
    """Resolve a membership's effective organization permissions.

    Precedence: the membership's stored map (a per-member snapshot that
    ``update-role`` syncs and tests use as an override), then the role's own
    permissions (active ``OrganizationRole`` row, else the system template).
    Reading the role row keeps members created after a role was customized in
    step with it.
    """
    if not membership:
        return normalize_org_security_permissions({})

    perms = membership.security_permissions or {}
    if perms:
        return normalize_org_security_permissions(perms)
    return resolve_org_role_permissions(membership.organization_id, membership.role)
