"""One definition of facility administrator across guards and gates.

Coverage guards (last-admin, self-lockout) and runtime gates resolve
administrators the same way: an active staff row, an active org membership in
the facility's organization, an active role, and effective permission keys.
The role code never matters.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from facilities.models import AppointmentStatus, Facility, Staff, StaffRole
from facilities.security import get_role_security_template, user_has_facility_permission
from organizations.models import Organization, OrganizationMembership

User = get_user_model()


class FacilityAdministratorDefinitionTests(TestCase):
    def setUp(self):
        self.organization = Organization.objects.create(
            name="CareFlow Health",
            slug="careflow-health",
        )
        self.other_organization = Organization.objects.create(
            name="Other Health",
            slug="other-health",
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Main Clinic",
            timezone="America/New_York",
        )
        self.admin_role = StaffRole.objects.get(facility=self.facility, code="admin")
        self.staff_role = StaffRole.objects.get(facility=self.facility, code="staff")
        self.manager_role = StaffRole.objects.create(
            facility=self.facility,
            code="practice_manager",
            name="Practice manager",
            security_permissions=get_role_security_template("admin"),
        )
        self.client = APIClient()

    def make_member(
        self,
        username,
        role,
        *,
        org_role=OrganizationMembership.ROLE_MEMBER,
        organization=None,
        membership_active=True,
        security_overrides=None,
    ):
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
        staff = Staff.objects.create(
            user=user,
            facility=self.facility,
            role=role,
            is_active=True,
            is_default=True,
            security_overrides=security_overrides or {},
        )
        # Staff validation requires a matching active membership at creation,
        # so later membership changes are applied directly.
        OrganizationMembership.objects.filter(user=user).update(
            organization=organization or self.organization,
            is_active=membership_active,
        )
        return user, staff

    def make_break_glass_owner(self, username):
        # Manages security as org owner without holding both self-management
        # permissions, so it never counts as an administrator itself.
        user, _ = self.make_member(
            username,
            self.staff_role,
            org_role=OrganizationMembership.ROLE_OWNER,
            security_overrides={"admin.facility.manage": True},
        )
        return user

    def request(self, method, user, path, payload=None):
        self.client.force_authenticate(user)
        return getattr(self.client, method)(
            f"{path}?facility_id={self.facility.pk}",
            payload,
            format="json",
            HTTP_HOST="localhost:8000",
        )

    def assert_blocked_without_administrator(self, response):
        self.assertEqual(response.status_code, 403)
        self.assertIn("without an administrator", str(response.data["detail"]))

    def test_inactive_membership_admin_does_not_cover_staff_deletion(self):
        self.make_member("dormant_member", self.admin_role, membership_active=False)
        _, last_staff = self.make_member("last_admin", self.admin_role)
        owner = self.make_break_glass_owner("delete_owner")

        response = self.request(
            "delete", owner, f"/v1/facilities/staff/{last_staff.pk}/"
        )

        self.assert_blocked_without_administrator(response)
        last_staff.refresh_from_db()
        self.assertTrue(last_staff.is_active)

    def test_inactive_membership_admin_does_not_cover_staff_deactivation(self):
        self.make_member("dormant_member", self.admin_role, membership_active=False)
        _, last_staff = self.make_member("last_admin", self.admin_role)
        owner = self.make_break_glass_owner("patch_owner")

        response = self.request(
            "patch",
            owner,
            f"/v1/facilities/staff/{last_staff.pk}/",
            {"is_active": False},
        )

        self.assert_blocked_without_administrator(response)
        last_staff.refresh_from_db()
        self.assertTrue(last_staff.is_active)

    def test_inactive_membership_admin_does_not_cover_role_deactivation(self):
        self.make_member("dormant_member", self.admin_role, membership_active=False)
        self.make_member("manager", self.manager_role)
        owner = self.make_break_glass_owner("role_owner")

        response = self.request(
            "patch",
            owner,
            f"/v1/facilities/staff-roles/{self.manager_role.pk}/",
            {"is_active": False},
        )

        self.assert_blocked_without_administrator(response)
        self.manager_role.refresh_from_db()
        self.assertTrue(self.manager_role.is_active)

    def test_other_organization_membership_does_not_count_as_administrator(self):
        foreign_user, _ = self.make_member(
            "foreign_admin",
            self.admin_role,
            organization=self.other_organization,
        )
        _, last_staff = self.make_member("last_admin", self.admin_role)
        owner = self.make_break_glass_owner("foreign_owner")

        self.assertFalse(
            user_has_facility_permission(
                foreign_user, self.facility.id, "admin.facility.manage"
            )
        )
        response = self.request(
            "delete", owner, f"/v1/facilities/staff/{last_staff.pk}/"
        )

        self.assert_blocked_without_administrator(response)

    def test_custom_role_with_admin_permissions_passes_facility_admin_gate(self):
        manager, _ = self.make_member("gate_manager", self.manager_role)
        status = AppointmentStatus.objects.get(facility=self.facility, code="pending")

        response = self.request(
            "patch",
            manager,
            f"/v1/facilities/appointment-statuses/{status.pk}/",
            {"name": "Pending Review"},
        )
        me = self.client.get("/v1/users/me/", HTTP_HOST="localhost:8000")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(me.data["admin_facility_ids"], [self.facility.id])

    def test_admin_role_without_facility_manage_fails_facility_admin_gate(self):
        limited, _ = self.make_member(
            "gate_limited",
            self.admin_role,
            security_overrides={"admin.facility.manage": False},
        )
        status = AppointmentStatus.objects.get(facility=self.facility, code="pending")

        response = self.request(
            "patch",
            limited,
            f"/v1/facilities/appointment-statuses/{status.pk}/",
            {"name": "Pending Review"},
        )
        me = self.client.get("/v1/users/me/", HTTP_HOST="localhost:8000")

        self.assertEqual(response.status_code, 403)
        self.assertEqual(me.data["admin_facility_ids"], [])

    def test_facility_manager_without_security_manage_cannot_create_staff(self):
        # admin.facility.manage passes the facility admin gate, but assigning a
        # role on create is a permission grant, like a role change on update.
        limited, _ = self.make_member(
            "create_limited",
            self.manager_role,
            security_overrides={"admin.security.manage": False},
        )
        physician_role = StaffRole.objects.get(facility=self.facility, code="physician")
        target = User.objects.create_user(
            username="create_target",
            password="testpass123",
            email="create-target@example.com",
        )
        OrganizationMembership.objects.create(
            user=target,
            organization=self.organization,
            role=OrganizationMembership.ROLE_MEMBER,
        )

        response = self.request(
            "post",
            limited,
            "/v1/facilities/staff/",
            {"user_id": target.pk, "role_id": physician_role.pk},
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(
            Staff.objects.filter(user=target, facility=self.facility).exists()
        )
