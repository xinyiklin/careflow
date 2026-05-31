from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from facilities.models import AppointmentStatus, Facility, Staff, StaffRole
from facilities.security import get_role_security_template, user_has_facility_permission
from organizations.models import Organization, OrganizationMembership

User = get_user_model()


class FacilitySecurityPermissionTests(TestCase):
    def setUp(self):
        self.organization = Organization.objects.create(
            name="CareFlow Health",
            slug="careflow-health",
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Main Clinic",
            timezone="America/New_York",
        )
        self.user = User.objects.create_user(
            username="security_admin",
            password="testpass123",
            email="security-admin@example.com",
        )
        OrganizationMembership.objects.create(
            user=self.user,
            organization=self.organization,
            role=OrganizationMembership.ROLE_ADMIN,
            is_active=True,
        )

    def test_role_defaults_and_user_overrides_build_effective_permissions(self):
        role = StaffRole.objects.get(facility=self.facility, code="admin")
        staff = Staff.objects.create(
            user=self.user,
            facility=self.facility,
            role=role,
            is_active=True,
            is_default=True,
        )

        self.assertTrue(
            user_has_facility_permission(
                self.user,
                self.facility.id,
                "schedule.view",
            )
        )

        staff.security_overrides = {"schedule.view": False}
        staff.save()

        self.assertFalse(
            user_has_facility_permission(
                self.user,
                self.facility.id,
                "schedule.view",
            )
        )
        self.assertTrue(
            user_has_facility_permission(
                self.user,
                self.facility.id,
                "patients.view",
            )
        )

    def test_appointment_status_update_does_not_use_staff_role_permissions(self):
        Staff.objects.create(
            user=self.user,
            facility=self.facility,
            role=StaffRole.objects.get(facility=self.facility, code="admin"),
            is_active=True,
            is_default=True,
        )
        status = AppointmentStatus.objects.get(
            facility=self.facility,
            code="pending",
        )
        client = APIClient()
        client.force_authenticate(self.user)

        response = client.patch(
            f"/v1/facilities/appointment-statuses/{status.pk}/",
            {
                "name": "Pending Review",
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        status.refresh_from_db()
        self.assertEqual(status.name, "Pending Review")

    def test_facility_admin_can_update_facility(self):
        facility_admin = User.objects.create_user(
            username="fac_admin",
            password="testpass123",
            email="fac-admin@example.com",
        )
        OrganizationMembership.objects.create(
            user=facility_admin,
            organization=self.organization,
            role=OrganizationMembership.ROLE_MEMBER,
            is_active=True,
        )
        Staff.objects.create(
            user=facility_admin,
            facility=self.facility,
            role=StaffRole.objects.get(facility=self.facility, code="admin"),
            is_active=True,
            is_default=True,
        )
        client = APIClient()
        client.force_authenticate(facility_admin)

        response = client.patch(
            f"/v1/facilities/{self.facility.pk}/",
            {
                "name": "Updated Clinic Name",
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(response.status_code, 200)
        self.facility.refresh_from_db()
        self.assertEqual(self.facility.name, "Updated Clinic Name")

    def test_org_admin_can_update_facility(self):
        client = APIClient()
        client.force_authenticate(self.user)

        response = client.patch(
            f"/v1/facilities/{self.facility.pk}/",
            {
                "name": "Updated Clinic Name By Org Admin",
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(response.status_code, 200)
        self.facility.refresh_from_db()
        self.assertEqual(self.facility.name, "Updated Clinic Name By Org Admin")

    def test_facility_non_admin_cannot_update_facility(self):
        facility_staff = User.objects.create_user(
            username="fac_staff",
            password="testpass123",
            email="fac-staff@example.com",
        )
        OrganizationMembership.objects.create(
            user=facility_staff,
            organization=self.organization,
            role=OrganizationMembership.ROLE_MEMBER,
            is_active=True,
        )
        Staff.objects.create(
            user=facility_staff,
            facility=self.facility,
            role=StaffRole.objects.get(facility=self.facility, code="staff"),
            is_active=True,
            is_default=True,
        )
        client = APIClient()
        client.force_authenticate(facility_staff)

        response = client.patch(
            f"/v1/facilities/{self.facility.pk}/",
            {
                "name": "Updated Clinic Name By Staff",
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(response.status_code, 403)


class FacilitySecurityManagementTests(TestCase):
    def setUp(self):
        self.organization = Organization.objects.create(
            name="CareFlow Health",
            slug="careflow-health",
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Main Clinic",
            timezone="America/New_York",
        )
        self.admin_role = StaffRole.objects.get(facility=self.facility, code="admin")
        self.staff_role = StaffRole.objects.get(facility=self.facility, code="staff")
        self.client = APIClient()

    def make_admin(self, username, org_role, security_overrides=None):
        user = User.objects.create_user(
            username=username,
            password="testpass123",
            email=f"{username}@example.com",
        )
        OrganizationMembership.objects.create(
            user=user,
            organization=self.organization,
            role=org_role,
            is_active=True,
        )
        Staff.objects.create(
            user=user,
            facility=self.facility,
            role=self.admin_role,
            is_active=True,
            is_default=True,
            security_overrides=security_overrides or {},
        )
        return user

    def patch_role_security(self, user, role, permissions):
        self.client.force_authenticate(user)
        return self.client.patch(
            f"/v1/facilities/staff-roles/{role.pk}/?facility_id={self.facility.pk}",
            {"security_permissions": permissions},
            format="json",
            HTTP_HOST="localhost:8000",
        )

    def patch_staff_overrides(self, user, staff, overrides):
        self.client.force_authenticate(user)
        return self.client.patch(
            f"/v1/facilities/staff/{staff.pk}/?facility_id={self.facility.pk}",
            {"security_overrides": overrides},
            format="json",
            HTTP_HOST="localhost:8000",
        )

    def test_admin_with_security_manage_can_edit_role_security(self):
        admin = self.make_admin("fac_sec_admin", OrganizationMembership.ROLE_MEMBER)
        response = self.patch_role_security(
            admin, self.staff_role, get_role_security_template("staff")
        )
        self.assertEqual(response.status_code, 200)

    def test_admin_without_security_manage_cannot_edit_role_security(self):
        # Facility admin keeps admin.facility.manage but is denied
        # admin.security.manage via override.
        admin = self.make_admin(
            "fac_limited_admin",
            OrganizationMembership.ROLE_MEMBER,
            security_overrides={"admin.security.manage": False},
        )
        response = self.patch_role_security(
            admin, self.staff_role, get_role_security_template("staff")
        )
        self.assertEqual(response.status_code, 403)

    def test_cannot_remove_security_manage_from_own_role(self):
        admin = self.make_admin("fac_self_sec", OrganizationMembership.ROLE_MEMBER)
        perms = get_role_security_template("admin")
        perms["admin.security.manage"] = False
        response = self.patch_role_security(admin, self.admin_role, perms)
        self.assertEqual(response.status_code, 403)

    def test_cannot_remove_facility_manage_from_own_role(self):
        admin = self.make_admin("fac_self_fac", OrganizationMembership.ROLE_MEMBER)
        perms = get_role_security_template("admin")
        perms["admin.facility.manage"] = False
        response = self.patch_role_security(admin, self.admin_role, perms)
        self.assertEqual(response.status_code, 403)

    def test_cannot_revoke_own_security_manage_via_override(self):
        admin = self.make_admin("fac_self_override", OrganizationMembership.ROLE_MEMBER)
        staff = Staff.objects.get(user=admin, facility=self.facility)
        response = self.patch_staff_overrides(
            admin, staff, {"admin.security.manage": False}
        )
        self.assertEqual(response.status_code, 403)

    def test_org_owner_can_manage_security_without_explicit_permission(self):
        # Owner is break-glass: even with the override revoking security.manage,
        # the owner can still manage facility security.
        owner = self.make_admin(
            "fac_owner",
            OrganizationMembership.ROLE_OWNER,
            security_overrides={"admin.security.manage": False},
        )
        response = self.patch_role_security(
            owner, self.staff_role, get_role_security_template("staff")
        )
        self.assertEqual(response.status_code, 200)
