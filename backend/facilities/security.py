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
    "documents.delete",
    "documents.categories.manage",
    "pharmacies.organization.manage",
    "pharmacies.facility.manage",
    "admin.facility.manage",
    "admin.security.manage",
    "audit.view",
]

# Losing either of these removes access to administration or the security
# panel, so they are treated as the markers of a facility administrator.
SELF_MANAGEMENT_PERMISSIONS = ("admin.facility.manage", "admin.security.manage")

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
        "documents.delete": True,
        "documents.categories.manage": True,
        "pharmacies.organization.manage": True,
        "pharmacies.facility.manage": True,
        "admin.facility.manage": True,
        "admin.security.manage": True,
        "audit.view": True,
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
        "documents.delete": False,
        "documents.categories.manage": False,
        "pharmacies.organization.manage": False,
        "pharmacies.facility.manage": False,
        "admin.facility.manage": False,
        "admin.security.manage": False,
        "audit.view": False,
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
        "documents.delete": True,
        "documents.categories.manage": False,
        "pharmacies.organization.manage": False,
        "pharmacies.facility.manage": False,
        "admin.facility.manage": False,
        "admin.security.manage": False,
        "audit.view": False,
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
        "documents.delete": True,
        "documents.categories.manage": False,
        "pharmacies.organization.manage": False,
        "pharmacies.facility.manage": False,
        "admin.facility.manage": False,
        "admin.security.manage": False,
        "audit.view": False,
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
        "documents.delete": False,
        "documents.categories.manage": False,
        "pharmacies.organization.manage": False,
        "pharmacies.facility.manage": False,
        "admin.facility.manage": False,
        "admin.security.manage": False,
        "audit.view": False,
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


def resolve_effective_permissions(role_permissions, security_overrides):
    effective_permissions = normalize_security_permissions(role_permissions or {})
    overrides = security_overrides or {}

    for permission, value in overrides.items():
        if permission in effective_permissions and value is not None:
            effective_permissions[permission] = bool(value)

    return effective_permissions


def get_effective_staff_permissions(staff):
    if not staff or not staff.role:
        return normalize_security_permissions({})

    return resolve_effective_permissions(
        staff.role.security_permissions, staff.security_overrides
    )


def holds_all_self_management(role_permissions, security_overrides):
    """Whether a role+override pairing grants every self-management permission.

    Operates on raw permission/override maps so a prospective (not-yet-saved)
    role or override change can be evaluated without constructing a Staff row.
    """
    effective = resolve_effective_permissions(role_permissions, security_overrides)
    return all(
        effective.get(permission, False) for permission in SELF_MANAGEMENT_PERMISSIONS
    )


def user_has_facility_permission(user, facility_id, permission):
    if not user or not user.is_authenticated or not facility_id:
        return False

    if permission not in SECURITY_PERMISSIONS:
        return False

    staff = (
        user.staff_profiles.filter(
            facility_id=facility_id,
            is_active=True,
            facility__is_active=True,
            role__is_active=True,
            user__org_membership__is_active=True,
        )
        .select_related("role")
        .first()
    )

    if not staff:
        return False

    return get_effective_staff_permissions(staff).get(permission, False)
