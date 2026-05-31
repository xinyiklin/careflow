SECURITY_PERMISSIONS = [
    "schedule.view",
    "schedule.create",
    "schedule.update",
    "schedule.delete",
    "patients.view",
    "patients.create",
    "patients.update",
    "patients.delete",
    "clinical.view",
    "clinical.create",
    "clinical.update",
    "clinical.sign",
    "clinical.unsign",
    "medications.view",
    "medications.manage",
    "medications.refill.approve",
    "medications.prescribe",
    "messaging.view",
    "messaging.respond",
    "allergies.view",
    "allergies.manage",
    "insurance.view",
    "insurance.manage",
    "billing.view",
    "billing.manage",
    "billing.fee_schedules.manage",
    "documents.view",
    "documents.manage",
    "documents.categories.manage",
    "pharmacies.organization.manage",
    "pharmacies.facility.manage",
    "admin.facility.manage",
    "admin.security.manage",
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
        "clinical.view": True,
        "clinical.create": True,
        "clinical.update": True,
        "clinical.sign": True,
        "clinical.unsign": True,
        "medications.view": True,
        "medications.manage": True,
        "medications.refill.approve": True,
        "medications.prescribe": True,
        "messaging.view": True,
        "messaging.respond": True,
        "allergies.view": True,
        "allergies.manage": True,
        "insurance.view": True,
        "insurance.manage": True,
        "billing.view": True,
        "billing.manage": True,
        "billing.fee_schedules.manage": True,
        "documents.view": True,
        "documents.manage": True,
        "documents.categories.manage": True,
        "pharmacies.organization.manage": True,
        "pharmacies.facility.manage": True,
        "admin.facility.manage": True,
        "admin.security.manage": True,
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
        "clinical.view": True,
        "clinical.create": True,
        "clinical.update": True,
        "clinical.sign": True,
        "clinical.unsign": False,
        "medications.view": True,
        "medications.manage": True,
        "medications.refill.approve": True,
        "medications.prescribe": True,
        "messaging.view": True,
        "messaging.respond": True,
        "allergies.view": True,
        "allergies.manage": True,
        "insurance.view": True,
        "insurance.manage": False,
        "billing.view": True,
        "billing.manage": False,
        "billing.fee_schedules.manage": False,
        "documents.view": True,
        "documents.manage": False,
        "documents.categories.manage": False,
        "pharmacies.organization.manage": False,
        "pharmacies.facility.manage": False,
        "admin.facility.manage": False,
        "admin.security.manage": False,
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
        "clinical.view": True,
        "clinical.create": True,
        "clinical.update": True,
        "clinical.sign": False,
        "clinical.unsign": False,
        "medications.view": True,
        "medications.manage": True,
        "medications.refill.approve": True,
        "medications.prescribe": False,
        "messaging.view": True,
        "messaging.respond": True,
        "allergies.view": True,
        "allergies.manage": True,
        "insurance.view": True,
        "insurance.manage": False,
        "billing.view": False,
        "billing.manage": False,
        "billing.fee_schedules.manage": False,
        "documents.view": True,
        "documents.manage": True,
        "documents.categories.manage": False,
        "pharmacies.organization.manage": False,
        "pharmacies.facility.manage": False,
        "admin.facility.manage": False,
        "admin.security.manage": False,
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
        "clinical.view": True,
        "clinical.create": False,
        "clinical.update": False,
        "clinical.sign": False,
        "clinical.unsign": False,
        "medications.view": True,
        "medications.manage": False,
        "medications.refill.approve": False,
        "medications.prescribe": False,
        "messaging.view": True,
        "messaging.respond": True,
        "allergies.view": True,
        "allergies.manage": False,
        "insurance.view": True,
        "insurance.manage": True,
        "billing.view": False,
        "billing.manage": False,
        "billing.fee_schedules.manage": False,
        "documents.view": True,
        "documents.manage": True,
        "documents.categories.manage": False,
        "pharmacies.organization.manage": False,
        "pharmacies.facility.manage": False,
        "admin.facility.manage": False,
        "admin.security.manage": False,
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
        "clinical.view": False,
        "clinical.create": False,
        "clinical.update": False,
        "clinical.sign": False,
        "clinical.unsign": False,
        "medications.view": False,
        "medications.manage": False,
        "medications.refill.approve": False,
        "medications.prescribe": False,
        "messaging.view": False,
        "messaging.respond": False,
        "allergies.view": False,
        "allergies.manage": False,
        "insurance.view": True,
        "insurance.manage": False,
        "billing.view": True,
        "billing.manage": True,
        "billing.fee_schedules.manage": False,
        "documents.view": True,
        "documents.manage": False,
        "documents.categories.manage": False,
        "pharmacies.organization.manage": False,
        "pharmacies.facility.manage": False,
        "admin.facility.manage": False,
        "admin.security.manage": False,
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
