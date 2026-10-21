"""Regressions for organization People and Security.

Covers the default facility role on assignment, the create response shape,
permission-snapshot drift between memberships and roles, and the org
pharmacy access gate.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from facilities.models import Facility, Staff, StaffRole

from .models import Organization, OrganizationMembership, OrganizationRole
from .security import get_org_role_security_template

User = get_user_model()
PEOPLE_URL = "/v1/organizations/people/"
SECURITY_URL = "/v1/organizations/security/"
UPDATE_ROLE_URL = "/v1/organizations/security/update-role/"
PHARMACIES_URL = "/v1/organizations/pharmacies/"


class PeopleSecurityTestBase(TestCase):
    def setUp(self):
        self.client = APIClient(HTTP_HOST="localhost:8000")
        self.organization = Organization.objects.create(
            name="People Org", slug="people-org"
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Main Clinic",
            timezone="America/New_York",
        )
        self.admin_role = StaffRole.objects.get(facility=self.facility, code="admin")
        self.staff_role = StaffRole.objects.get(facility=self.facility, code="staff")
        self.owner = self.make_user("owner", OrganizationMembership.ROLE_OWNER)
        # A standing facility administrator so demotions never strip the last one.
        self.facility_admin = self.make_user(
            "fac_admin", OrganizationMembership.ROLE_MEMBER
        )
        Staff.objects.create(
            user=self.facility_admin,
            facility=self.facility,
            role=self.admin_role,
            is_active=True,
        )

    def make_user(self, username, role, security_permissions=None):
        user = User.objects.create_user(
            username=username,
            password="testpass123",
            email=f"{username}@example.com",
        )
        OrganizationMembership.objects.create(
            user=user,
            organization=self.organization,
            role=role,
            is_active=True,
            security_permissions=security_permissions or {},
        )
        return user

    def post_person(self, **overrides):
        payload = {
            "username": "new_person",
            "email": "new_person@example.com",
            "role": OrganizationMembership.ROLE_MEMBER,
        }
        payload.update(overrides)
        self.client.force_authenticate(self.owner)
        return self.client.post(PEOPLE_URL, payload, format="json")

    def patch_person(self, user, payload):
        membership = OrganizationMembership.objects.get(user=user)
        self.client.force_authenticate(self.owner)
        return self.client.patch(
            f"{PEOPLE_URL}{membership.pk}/", payload, format="json"
        )


class PeopleDefaultRoleTests(PeopleSecurityTestBase):
    def test_create_with_facility_grants_staff_role_not_admin(self):
        response = self.post_person(
            facility_ids=[self.facility.id], admin_facility_ids=[]
        )
        self.assertEqual(response.status_code, 201, response.data)
        staff = Staff.objects.get(user__username="new_person", facility=self.facility)
        self.assertEqual(staff.role.code, "staff")

    def test_create_with_admin_flag_grants_admin_role(self):
        response = self.post_person(
            facility_ids=[self.facility.id], admin_facility_ids=[self.facility.id]
        )
        self.assertEqual(response.status_code, 201, response.data)
        staff = Staff.objects.get(user__username="new_person", facility=self.facility)
        self.assertEqual(staff.role.code, "admin")

    def test_update_assigning_new_facility_grants_staff_role(self):
        person = self.make_user("plain_person", OrganizationMembership.ROLE_MEMBER)
        response = self.patch_person(
            person, {"facility_ids": [self.facility.id], "admin_facility_ids": []}
        )
        self.assertEqual(response.status_code, 200, response.data)
        staff = Staff.objects.get(user=person, facility=self.facility)
        self.assertEqual(staff.role.code, "staff")

    def test_update_removing_admin_flag_demotes_to_staff_role(self):
        person = self.make_user("second_admin", OrganizationMembership.ROLE_MEMBER)
        Staff.objects.create(
            user=person, facility=self.facility, role=self.admin_role, is_active=True
        )
        response = self.patch_person(
            person, {"facility_ids": [self.facility.id], "admin_facility_ids": []}
        )
        self.assertEqual(response.status_code, 200, response.data)
        staff = Staff.objects.get(user=person, facility=self.facility)
        self.assertEqual(staff.role.code, "staff")

    def test_update_assigns_admin_even_without_a_non_admin_role(self):
        StaffRole.objects.filter(facility=self.facility).exclude(code="admin").update(
            is_active=False
        )
        person = self.make_user("solo_admin", OrganizationMembership.ROLE_MEMBER)
        response = self.patch_person(
            person,
            {
                "facility_ids": [self.facility.id],
                "admin_facility_ids": [self.facility.id],
            },
        )
        self.assertEqual(response.status_code, 200, response.data)
        staff = Staff.objects.get(user=person, facility=self.facility)
        self.assertEqual(staff.role.code, "admin")

    def test_default_role_skips_a_staff_role_customized_to_administer(self):
        StaffRole.objects.filter(pk=self.staff_role.pk).update(
            security_permissions={"admin.security.manage": True}
        )
        response = self.post_person(
            facility_ids=[self.facility.id], admin_facility_ids=[]
        )
        self.assertEqual(response.status_code, 201, response.data)
        staff = Staff.objects.get(user__username="new_person", facility=self.facility)
        self.assertEqual(staff.role.code, "biller")

    def test_default_role_skips_roles_with_any_self_management_permission(self):
        StaffRole.objects.filter(pk=self.staff_role.pk).update(is_active=False)
        # "Auditor" sorts before "Biller" but can reach the security panel.
        StaffRole.objects.create(
            facility=self.facility,
            code="auditor",
            name="Auditor",
            security_permissions={"admin.security.manage": True},
        )
        response = self.post_person(
            facility_ids=[self.facility.id], admin_facility_ids=[]
        )
        self.assertEqual(response.status_code, 201, response.data)
        staff = Staff.objects.get(user__username="new_person", facility=self.facility)
        self.assertEqual(staff.role.code, "biller")

    def test_default_role_never_resolves_to_an_administrative_role(self):
        # Without a ``staff`` role the fallback must skip roles that grant
        # facility administration; Biller sorts first among the rest.
        StaffRole.objects.filter(pk=self.staff_role.pk).update(is_active=False)
        response = self.post_person(
            facility_ids=[self.facility.id], admin_facility_ids=[]
        )
        self.assertEqual(response.status_code, 201, response.data)
        staff = Staff.objects.get(user__username="new_person", facility=self.facility)
        self.assertEqual(staff.role.code, "biller")


class PeopleCreateResponseTests(PeopleSecurityTestBase):
    def test_create_returns_201_with_person_shape(self):
        response = self.post_person(
            facility_ids=[self.facility.id], admin_facility_ids=[]
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertIn("id", response.data)
        self.assertEqual(response.data["username"], "new_person")
        self.assertEqual(response.data["role"], OrganizationMembership.ROLE_MEMBER)
        self.assertEqual(response.data["facility_ids"], [self.facility.id])
        self.assertEqual(response.data["admin_facility_ids"], [])
        self.assertEqual(response.data["facility_names"], [self.facility.name])


class OrgPermissionSnapshotTests(PeopleSecurityTestBase):
    def test_demoted_admin_loses_security_management(self):
        demoted = self.make_user(
            "demoted_admin",
            OrganizationMembership.ROLE_ADMIN,
            security_permissions=get_org_role_security_template("admin"),
        )
        response = self.patch_person(
            demoted, {"role": OrganizationMembership.ROLE_MEMBER}
        )
        self.assertEqual(response.status_code, 200, response.data)
        membership = OrganizationMembership.objects.get(user=demoted)
        self.assertEqual(membership.security_permissions, {})
        self.client.force_authenticate(demoted)
        self.assertEqual(self.client.get(SECURITY_URL).status_code, 403)

    def test_update_role_persists_to_role_row_and_reaches_new_members(self):
        perms = get_org_role_security_template("member")
        perms["org.security.manage"] = True
        self.client.force_authenticate(self.owner)
        response = self.client.patch(
            UPDATE_ROLE_URL,
            {"role": "member", "security_permissions": perms},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        role_row = OrganizationRole.objects.get(
            organization=self.organization, code="member"
        )
        self.assertTrue(role_row.is_system_role)
        self.assertTrue(role_row.security_permissions["org.security.manage"])

        # A member created afterwards carries an empty snapshot and must
        # resolve to the role row, not the built-in template.
        response = self.post_person(username="late_member", email="late@example.com")
        self.assertEqual(response.status_code, 201, response.data)
        self.client.force_authenticate(User.objects.get(username="late_member"))
        self.assertEqual(self.client.get(SECURITY_URL).status_code, 200)

    def test_update_role_syncs_inactive_members_too(self):
        dormant = self.make_user(
            "dormant",
            OrganizationMembership.ROLE_MEMBER,
            security_permissions={"org.security.manage": False},
        )
        OrganizationMembership.objects.filter(user=dormant).update(is_active=False)
        perms = get_org_role_security_template("member")
        perms["org.security.manage"] = True
        self.client.force_authenticate(self.owner)
        response = self.client.patch(
            UPDATE_ROLE_URL,
            {"role": "member", "security_permissions": perms},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        membership = OrganizationMembership.objects.get(user=dormant)
        self.assertTrue(membership.security_permissions["org.security.manage"])

    def test_update_role_rejects_unknown_role(self):
        self.client.force_authenticate(self.owner)
        response = self.client.patch(
            UPDATE_ROLE_URL,
            {"role": "ghost", "security_permissions": {}},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(
            OrganizationRole.objects.filter(
                organization=self.organization, code="ghost"
            ).exists()
        )

    def test_roles_endpoint_rejects_security_permissions(self):
        role = OrganizationRole.objects.create(
            organization=self.organization,
            code="member",
            name="Member",
            is_system_role=True,
            is_deletable=False,
        )
        self.client.force_authenticate(self.owner)
        response = self.client.patch(
            f"/v1/organizations/roles/{role.pk}/",
            {
                "description": "Standard access",
                "security_permissions": {"org.security.manage": True},
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("security_permissions", response.data)
        role.refresh_from_db()
        self.assertEqual(role.security_permissions, {})

        response = self.client.patch(
            f"/v1/organizations/roles/{role.pk}/",
            {"description": "Standard access"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        role.refresh_from_db()
        self.assertEqual(role.description, "Standard access")


class RoleCodeHardeningTests(PeopleSecurityTestBase):
    """Role codes resolve permissions by exact match and must be validated,
    and handing out a security-bearing role is itself security management."""

    def strip_admin_security_management(self):
        perms = get_org_role_security_template("admin")
        perms["org.security.manage"] = False
        self.client.force_authenticate(self.owner)
        response = self.client.patch(
            UPDATE_ROLE_URL,
            {"role": "admin", "security_permissions": perms},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)

    def test_admin_cannot_regain_security_management_via_case_variant_role(self):
        admin = self.make_user("governed_admin", OrganizationMembership.ROLE_ADMIN)
        self.strip_admin_security_management()
        self.client.force_authenticate(admin)
        self.assertEqual(self.client.get(SECURITY_URL).status_code, 403)

        membership = OrganizationMembership.objects.get(user=admin)
        response = self.client.patch(
            f"{PEOPLE_URL}{membership.pk}/", {"role": "Admin"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("role", response.data)
        membership.refresh_from_db()
        self.assertEqual(membership.role, OrganizationMembership.ROLE_ADMIN)
        self.assertEqual(self.client.get(SECURITY_URL).status_code, 403)

    def test_create_rejects_unknown_role_code(self):
        response = self.post_person(role="Admin")
        self.assertEqual(response.status_code, 400)
        self.assertIn("role", response.data)
        self.assertFalse(User.objects.filter(username="new_person").exists())

    def test_assigning_security_bearing_role_requires_security_manager(self):
        admin = self.make_user("governed_admin", OrganizationMembership.ROLE_ADMIN)
        member = self.make_user("plain_member", OrganizationMembership.ROLE_MEMBER)
        self.strip_admin_security_management()
        perms = get_org_role_security_template("member")
        perms["org.security.manage"] = True
        OrganizationRole.objects.create(
            organization=self.organization,
            code="security_lead",
            name="Security Lead",
            security_permissions=perms,
        )
        membership = OrganizationMembership.objects.get(user=member)

        self.client.force_authenticate(admin)
        response = self.client.patch(
            f"{PEOPLE_URL}{membership.pk}/", {"role": "security_lead"}, format="json"
        )
        self.assertEqual(response.status_code, 403)
        membership.refresh_from_db()
        self.assertEqual(membership.role, OrganizationMembership.ROLE_MEMBER)

        response = self.patch_person(member, {"role": "security_lead"})
        self.assertEqual(response.status_code, 200, response.data)
        self.client.force_authenticate(member)
        self.assertEqual(self.client.get(SECURITY_URL).status_code, 200)

    def test_governed_admin_can_still_assign_plain_roles(self):
        admin = self.make_user("governed_admin", OrganizationMembership.ROLE_ADMIN)
        self.strip_admin_security_management()
        self.client.force_authenticate(admin)
        response = self.client.post(
            PEOPLE_URL,
            {
                "username": "front_desk_new",
                "email": "front_desk_new@example.com",
                "role": OrganizationMembership.ROLE_MEMBER,
                "facility_ids": [self.facility.id],
                "admin_facility_ids": [],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)

    def test_people_create_authorizes_before_validating_identity_fields(self):
        member = self.make_user("plain_member", OrganizationMembership.ROLE_MEMBER)
        self.client.force_authenticate(member)
        response = self.client.post(
            PEOPLE_URL,
            {
                "username": "probe",
                "email": self.owner.email,
                "role": OrganizationMembership.ROLE_MEMBER,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 403)


class OrgPharmacyAccessGateTests(PeopleSecurityTestBase):
    def test_staff_at_inactive_facility_cannot_manage_org_pharmacies(self):
        closed = Facility.objects.create(
            organization=self.organization,
            name="Closed Clinic",
            timezone="America/New_York",
            is_active=False,
        )
        user = self.make_user("closed_admin", OrganizationMembership.ROLE_MEMBER)
        Staff.objects.create(
            user=user,
            facility=closed,
            role=StaffRole.objects.get(facility=closed, code="admin"),
            is_active=True,
        )
        self.client.force_authenticate(user)
        self.assertEqual(self.client.get(PHARMACIES_URL).status_code, 403)

    def test_staff_with_inactive_role_cannot_manage_org_pharmacies(self):
        user = self.make_user("stale_role", OrganizationMembership.ROLE_MEMBER)
        role = StaffRole.objects.create(
            facility=self.facility,
            code="pharmacy_lead",
            name="Pharmacy Lead",
            security_permissions={"pharmacies.organization.manage": True},
        )
        Staff.objects.create(
            user=user, facility=self.facility, role=role, is_active=True
        )
        self.client.force_authenticate(user)
        self.assertEqual(self.client.get(PHARMACIES_URL).status_code, 200)

        StaffRole.objects.filter(pk=role.pk).update(is_active=False)
        self.assertEqual(self.client.get(PHARMACIES_URL).status_code, 403)
