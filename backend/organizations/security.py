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
    return normalize_org_security_permissions(
        ORG_ROLE_SECURITY_TEMPLATES.get(str(role or "").lower(), {})
    )


def get_effective_org_permissions(membership):
    if not membership:
        return normalize_org_security_permissions({})

    perms = membership.security_permissions or {}
    if not perms:
        perms = get_org_role_security_template(membership.role)

    return normalize_org_security_permissions(perms)
