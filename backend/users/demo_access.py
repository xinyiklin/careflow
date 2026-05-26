from facilities.models import Staff, StaffRole
from facilities.security import SECURITY_PERMISSIONS, get_role_security_template
from organizations.models import OrganizationMembership


def get_full_access_overrides():
    return {permission: True for permission in SECURITY_PERMISSIONS}


def ensure_demo_user_full_access(user):
    try:
        membership = user.org_membership
    except OrganizationMembership.DoesNotExist:
        return []

    if membership.role != OrganizationMembership.ROLE_OWNER or not membership.is_active:
        membership.role = OrganizationMembership.ROLE_OWNER
        membership.is_active = True
        membership.save(update_fields=["role", "is_active"])

    full_access_overrides = get_full_access_overrides()
    updated_profiles = []

    for facility in membership.organization.facilities.filter(is_active=True):
        admin_role, _ = StaffRole.objects.get_or_create(
            facility=facility,
            code="admin",
            defaults={
                "name": "Admin",
                "security_permissions": get_role_security_template("admin"),
                "is_system_role": True,
                "is_active": True,
                "is_deletable": False,
            },
        )
        staff, _ = Staff.objects.get_or_create(
            user=user,
            facility=facility,
            defaults={
                "role": admin_role,
                "is_active": True,
                "security_overrides": full_access_overrides,
            },
        )
        staff.role = admin_role
        staff.is_active = True
        staff.security_overrides = full_access_overrides
        staff.save()
        updated_profiles.append(staff)

    return updated_profiles
