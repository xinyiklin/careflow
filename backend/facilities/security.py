SECURITY_PERMISSIONS = [
    "schedule.view",
    "schedule.create",
    "schedule.update",
    "schedule.delete",
    "patients.view",
    "patients.create",
    "patients.update",
    "patients.delete",
    "documents.categories.manage",
    "pharmacies.manage",
    "admin.facility.manage",
]

ROLE_SECURITY_TEMPLATES = {
    "admin": {
        "schedule.view": True,
        "schedule.create": True,
        "schedule.update": True,
        "schedule.delete": True,
        "patients.view": True,
        "patients.create": True,
        "patients.update": True,
        "patients.delete": True,
        "documents.categories.manage": True,
        "pharmacies.manage": True,
        "admin.facility.manage": True,
    },
    "physician": {
        "schedule.view": True,
        "schedule.create": True,
        "schedule.update": True,
        "schedule.delete": False,
        "patients.view": True,
        "patients.create": False,
        "patients.update": True,
        "patients.delete": False,
        "documents.categories.manage": False,
        "pharmacies.manage": False,
        "admin.facility.manage": False,
    },
    "nurse": {
        "schedule.view": True,
        "schedule.create": True,
        "schedule.update": True,
        "schedule.delete": False,
        "patients.view": True,
        "patients.create": True,
        "patients.update": True,
        "patients.delete": False,
        "documents.categories.manage": False,
        "pharmacies.manage": False,
        "admin.facility.manage": False,
    },
    "staff": {
        "schedule.view": True,
        "schedule.create": True,
        "schedule.update": True,
        "schedule.delete": False,
        "patients.view": True,
        "patients.create": True,
        "patients.update": True,
        "patients.delete": False,
        "documents.categories.manage": False,
        "pharmacies.manage": False,
        "admin.facility.manage": False,
    },
    "biller": {
        "schedule.view": True,
        "schedule.create": False,
        "schedule.update": False,
        "schedule.delete": False,
        "patients.view": True,
        "patients.create": False,
        "patients.update": False,
        "patients.delete": False,
        "documents.categories.manage": False,
        "pharmacies.manage": False,
        "admin.facility.manage": False,
    },
}


def normalize_security_permissions(value):
    source = value if isinstance(value, dict) else {}
    return {
        permission: bool(source.get(permission, False))
        for permission in SECURITY_PERMISSIONS
    }


def normalize_security_overrides(value):
    source = value if isinstance(value, dict) else {}
    overrides = {}

    for permission in SECURITY_PERMISSIONS:
        if permission in source and source[permission] is not None:
            overrides[permission] = bool(source[permission])

    return overrides


def get_role_security_template(role_code):
    return normalize_security_permissions(
        ROLE_SECURITY_TEMPLATES.get(str(role_code or "").lower(), {})
    )


def get_effective_staff_permissions(staff):
    if not staff or not staff.role:
        return normalize_security_permissions({})

    role_permissions = staff.role.security_permissions or {}
    effective_permissions = normalize_security_permissions(role_permissions)
    overrides = staff.security_overrides or {}

    for permission, value in overrides.items():
        if permission in effective_permissions and value is not None:
            effective_permissions[permission] = bool(value)

    return effective_permissions


def user_has_facility_permission(user, facility_id, permission):
    if not user or not user.is_authenticated or not facility_id:
        return False

    if permission not in SECURITY_PERMISSIONS:
        return False

    staff = (
        user.staff_profiles.filter(facility_id=facility_id, is_active=True)
        .select_related("role")
        .first()
    )

    if not staff:
        return False

    return get_effective_staff_permissions(staff).get(permission, False)
