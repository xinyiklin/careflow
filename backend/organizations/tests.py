from django.test import TestCase
from rest_framework.test import APIClient

from facilities.models import Facility, Staff, StaffRole
from patients.models import Pharmacy

from .models import (
    FacilityPharmacyPreferenceOverride,
    Organization,
    OrganizationMembership,
    OrganizationPharmacyPreference,
    OrganizationRole,
)


class OrganizationPharmacyPermissionTests(TestCase):
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
        self.admin_role = StaffRole.objects.get(
            facility=self.facility,
            code="admin",
        )
        self.staff_role = StaffRole.objects.get(
            facility=self.facility,
            code="staff",
        )
        self.client = APIClient(HTTP_HOST="localhost:8000")

    def create_member_user(self, username, role, staff_role):
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.create_user(
            username=username,
            password="testpass123",
            email=f"{username}@example.com",
        )
        OrganizationMembership.objects.create(
            user=user,
            organization=self.organization,
            role=role,
            is_active=True,
        )
        Staff.objects.create(
            user=user,
            facility=self.facility,
            role=staff_role,
            is_active=True,
        )
        return user

    def test_facility_staff_with_pharmacy_permission_can_manage_pharmacies(self):
        user = self.create_member_user(
            "pharmacy_manager",
            OrganizationMembership.ROLE_MEMBER,
            self.admin_role,
        )
        self.client.force_authenticate(user=user)

        response = self.client.post(
            "/v1/organizations/pharmacies/",
            {
                "pharmacy": {
                    "name": "CareFlow Pharmacy",
                    "source": "custom",
                    "service_type": "retail",
                    "accepts_erx": True,
                    "is_active": True,
                },
                "is_preferred": True,
                "is_hidden": False,
                "is_active": True,
                "sort_order": 10,
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["pharmacy"]["name"], "CareFlow Pharmacy")
        pharmacy = Pharmacy.objects.get(name="CareFlow Pharmacy")
        self.assertEqual(pharmacy.owning_organization, self.organization)
        self.assertIsNone(pharmacy.owning_facility)

    def test_staff_without_pharmacy_permission_cannot_manage_pharmacies(self):
        user = self.create_member_user(
            "front_desk",
            OrganizationMembership.ROLE_MEMBER,
            self.staff_role,
        )
        self.client.force_authenticate(user=user)

        response = self.client.get(
            "/v1/organizations/pharmacies/",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 403)

    def test_global_pharmacy_details_cannot_be_edited_by_organization(self):
        user = self.create_member_user(
            "pharmacy_admin",
            OrganizationMembership.ROLE_ADMIN,
            self.admin_role,
        )
        other_org = Organization.objects.create(
            name="Other Health",
            slug="other-health",
        )
        pharmacy = Pharmacy.objects.create(
            name="Shared Directory Pharmacy",
            source=Pharmacy.SOURCE_DIRECTORY,
            service_type=Pharmacy.SERVICE_RETAIL,
            is_active=True,
        )
        preference = OrganizationPharmacyPreference.objects.create(
            organization=self.organization,
            pharmacy=pharmacy,
        )
        OrganizationPharmacyPreference.objects.create(
            organization=other_org,
            pharmacy=pharmacy,
        )
        self.client.force_authenticate(user=user)

        response = self.client.patch(
            f"/v1/organizations/pharmacies/{preference.pk}/",
            {
                "pharmacy": {
                    "name": "Main Clinic Pharmacy",
                    "phone_number": "555-123-4567",
                }
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        pharmacy.refresh_from_db()
        preference.refresh_from_db()
        self.assertEqual(pharmacy.name, "Shared Directory Pharmacy")
        self.assertEqual(preference.pharmacy_id, pharmacy.id)

    def test_other_organization_private_pharmacy_cannot_be_attached_by_id(self):
        user = self.create_member_user(
            "pharmacy_admin_two",
            OrganizationMembership.ROLE_ADMIN,
            self.admin_role,
        )
        other_org = Organization.objects.create(
            name="Other Health Two",
            slug="other-health-two",
        )
        custom_pharmacy = Pharmacy.objects.create(
            name="Other Custom Pharmacy",
            owning_organization=other_org,
            source=Pharmacy.SOURCE_CUSTOM,
            service_type=Pharmacy.SERVICE_RETAIL,
            is_active=True,
        )
        self.client.force_authenticate(user=user)

        response = self.client.post(
            "/v1/organizations/pharmacies/",
            {
                "pharmacy_id": custom_pharmacy.id,
                "is_preferred": True,
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("pharmacy_id", response.data)

    def test_facility_can_link_global_pharmacy_without_organization_preference(self):
        user = self.create_member_user(
            "facility_pharmacy_admin",
            OrganizationMembership.ROLE_MEMBER,
            self.admin_role,
        )
        global_pharmacy = Pharmacy.objects.create(
            name="Global Direct Pharmacy",
            source=Pharmacy.SOURCE_DIRECTORY,
            is_active=True,
        )
        private_pharmacy = Pharmacy.objects.create(
            name="Other Facility Pharmacy",
            owning_facility=Facility.objects.create(
                organization=self.organization,
                name="Other Clinic",
                timezone="America/New_York",
            ),
            source=Pharmacy.SOURCE_CUSTOM,
            is_active=True,
        )
        self.client.force_authenticate(user=user)

        directory_response = self.client.get(
            "/v1/organizations/facility-pharmacy-overrides/directory/",
            {"facility_id": self.facility.id},
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(directory_response.status_code, 200)
        directory_ids = {item["id"] for item in directory_response.data}
        self.assertIn(global_pharmacy.id, directory_ids)
        self.assertNotIn(private_pharmacy.id, directory_ids)

        create_response = self.client.post(
            "/v1/organizations/facility-pharmacy-overrides/"
            f"?facility_id={self.facility.id}",
            {"pharmacy_id": global_pharmacy.id, "is_active": True},
            format="json",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(create_response.status_code, 201)
        self.assertTrue(
            FacilityPharmacyPreferenceOverride.objects.filter(
                facility=self.facility,
                pharmacy=global_pharmacy,
            ).exists()
        )

    def test_org_admin_can_update_organization(self):
        user = self.create_member_user(
            "org_admin_user",
            OrganizationMembership.ROLE_ADMIN,
            self.admin_role,
        )
        self.client.force_authenticate(user=user)

        response = self.client.patch(
            f"/v1/organizations/{self.organization.pk}/",
            {
                "name": "Updated Org Name",
                "slug": "updated-org-name",
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(response.status_code, 200)
        self.organization.refresh_from_db()
        self.assertEqual(self.organization.name, "Updated Org Name")

    def test_org_member_cannot_update_organization(self):
        user = self.create_member_user(
            "org_member_user",
            OrganizationMembership.ROLE_MEMBER,
            self.staff_role,
        )
        self.client.force_authenticate(user=user)

        response = self.client.patch(
            f"/v1/organizations/{self.organization.pk}/",
            {
                "name": "Updated Org Name By Member",
                "slug": "updated-org-name-member",
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(response.status_code, 403)


class OrganizationSecurityManagementTests(TestCase):
    UPDATE_ROLE_URL = "/v1/organizations/security/update-role/"

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
        self.admin_staff_role = StaffRole.objects.get(
            facility=self.facility,
            code="admin",
        )
        self.staff_role = StaffRole.objects.get(
            facility=self.facility,
            code="staff",
        )
        self.client = APIClient(HTTP_HOST="localhost:8000")

    def make_user(self, username, role, security_permissions=None):
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.create_user(
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

    def add_staff(self, user, role):
        return Staff.objects.create(
            user=user,
            facility=self.facility,
            role=role,
            is_active=True,
        )

    def patch_role(self, user, role, security_permissions):
        self.client.force_authenticate(user=user)
        return self.client.patch(
            self.UPDATE_ROLE_URL,
            {"role": role, "security_permissions": security_permissions},
            format="json",
            HTTP_HOST="localhost:8000",
        )

    def test_owner_can_update_non_owner_role(self):
        owner = self.make_user("sec_owner", OrganizationMembership.ROLE_OWNER)
        response = self.patch_role(
            owner, "member", {"org.profile.view": True, "org.users.manage": True}
        )
        self.assertEqual(response.status_code, 200)

    def test_admin_with_security_manage_can_update_role(self):
        # Empty stored permissions fall back to the admin template, which grants
        # org.security.manage by default.
        admin = self.make_user("sec_admin", OrganizationMembership.ROLE_ADMIN)
        response = self.patch_role(admin, "member", {"org.profile.view": True})
        self.assertEqual(response.status_code, 200)

    def test_admin_without_security_manage_cannot_update_role(self):
        admin = self.make_user(
            "sec_limited_admin",
            OrganizationMembership.ROLE_ADMIN,
            security_permissions={"org.security.manage": False},
        )
        response = self.patch_role(admin, "member", {"org.profile.view": True})
        self.assertEqual(response.status_code, 403)

    def test_owner_role_is_protected_from_update_role(self):
        owner = self.make_user("sec_owner_protect", OrganizationMembership.ROLE_OWNER)
        response = self.patch_role(owner, "owner", {"org.security.manage": True})
        self.assertEqual(response.status_code, 403)

    def test_member_cannot_update_role(self):
        member = self.make_user("sec_member", OrganizationMembership.ROLE_MEMBER)
        response = self.patch_role(member, "member", {"org.profile.view": True})
        self.assertEqual(response.status_code, 403)

    def test_cannot_remove_security_manage_from_own_role(self):
        admin = self.make_user("sec_self_lock", OrganizationMembership.ROLE_ADMIN)
        response = self.patch_role(admin, "admin", {"org.security.manage": False})
        self.assertEqual(response.status_code, 403)

    def test_owner_role_cannot_be_edited_via_roles_endpoint(self):
        owner = self.make_user("sec_owner_roles", OrganizationMembership.ROLE_OWNER)
        owner_role = OrganizationRole.objects.create(
            organization=self.organization,
            code="owner",
            name="Owner",
            is_system_role=True,
            is_deletable=False,
            is_active=True,
        )
        self.client.force_authenticate(user=owner)
        response = self.client.patch(
            f"/v1/organizations/roles/{owner_role.pk}/",
            {"name": "Renamed Owner"},
            format="json",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(response.status_code, 403)

    def test_protected_system_role_cannot_be_deleted(self):
        owner = self.make_user("sec_owner_delete", OrganizationMembership.ROLE_OWNER)
        admin_role = OrganizationRole.objects.create(
            organization=self.organization,
            code="admin",
            name="Admin",
            is_system_role=True,
            is_deletable=False,
            is_active=True,
        )
        self.client.force_authenticate(user=owner)

        response = self.client.delete(
            f"/v1/organizations/roles/{admin_role.pk}/",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 403)
        admin_role.refresh_from_db()
        self.assertTrue(admin_role.is_active)

    def test_assigned_custom_role_cannot_be_deleted(self):
        owner = self.make_user(
            "assigned_org_role_owner", OrganizationMembership.ROLE_OWNER
        )
        role = OrganizationRole.objects.create(
            organization=self.organization,
            code="scheduler",
            name="Scheduler",
            security_permissions={},
        )
        self.make_user("assigned_org_role_member", role.code)
        self.client.force_authenticate(user=owner)

        response = self.client.delete(
            f"/v1/organizations/roles/{role.pk}/",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertTrue(OrganizationRole.objects.filter(pk=role.pk).exists())

    def test_admin_cannot_create_an_owner(self):
        admin = self.make_user("people_admin_create", OrganizationMembership.ROLE_ADMIN)
        self.client.force_authenticate(user=admin)

        response = self.client.post(
            "/v1/organizations/people/",
            {
                "username": "restricted_new_owner",
                "email": "restricted-new-owner@example.com",
                "role": OrganizationMembership.ROLE_OWNER,
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(
            OrganizationMembership.objects.filter(
                organization=self.organization,
                role=OrganizationMembership.ROLE_OWNER,
                user__username="restricted_new_owner",
            ).exists()
        )

    def test_admin_cannot_promote_member_to_owner(self):
        admin = self.make_user(
            "people_admin_promote", OrganizationMembership.ROLE_ADMIN
        )
        member = self.make_user(
            "people_member_promote", OrganizationMembership.ROLE_MEMBER
        )
        membership = OrganizationMembership.objects.get(user=member)
        self.client.force_authenticate(user=admin)

        response = self.client.patch(
            f"/v1/organizations/people/{membership.pk}/",
            {"role": OrganizationMembership.ROLE_OWNER},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 403)
        membership.refresh_from_db()
        self.assertEqual(membership.role, OrganizationMembership.ROLE_MEMBER)

    def test_owner_can_promote_member_to_owner(self):
        owner = self.make_user(
            "people_owner_promote", OrganizationMembership.ROLE_OWNER
        )
        member = self.make_user(
            "people_member_owner", OrganizationMembership.ROLE_MEMBER
        )
        membership = OrganizationMembership.objects.get(user=member)
        self.client.force_authenticate(user=owner)

        response = self.client.patch(
            f"/v1/organizations/people/{membership.pk}/",
            {"role": OrganizationMembership.ROLE_OWNER},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        membership.refresh_from_db()
        self.assertEqual(membership.role, OrganizationMembership.ROLE_OWNER)

    def test_only_active_owner_cannot_demote_self(self):
        owner = self.make_user(
            "people_only_owner_demote", OrganizationMembership.ROLE_OWNER
        )
        membership = OrganizationMembership.objects.get(user=owner)
        self.client.force_authenticate(user=owner)

        response = self.client.patch(
            f"/v1/organizations/people/{membership.pk}/",
            {"role": OrganizationMembership.ROLE_ADMIN},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 403)
        membership.refresh_from_db()
        self.assertEqual(membership.role, OrganizationMembership.ROLE_OWNER)

    def test_only_active_owner_cannot_deactivate_self(self):
        owner = self.make_user(
            "people_only_owner_deactivate", OrganizationMembership.ROLE_OWNER
        )
        membership = OrganizationMembership.objects.get(user=owner)
        self.client.force_authenticate(user=owner)

        response = self.client.patch(
            f"/v1/organizations/people/{membership.pk}/",
            {"is_active": False},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 403)
        membership.refresh_from_db()
        self.assertTrue(membership.is_active)

    def test_owner_can_demote_self_when_another_active_owner_exists(self):
        owner = self.make_user(
            "people_owner_with_backup", OrganizationMembership.ROLE_OWNER
        )
        self.make_user("people_backup_owner", OrganizationMembership.ROLE_OWNER)
        membership = OrganizationMembership.objects.get(user=owner)
        self.client.force_authenticate(user=owner)

        response = self.client.patch(
            f"/v1/organizations/people/{membership.pk}/",
            {"role": OrganizationMembership.ROLE_ADMIN},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        membership.refresh_from_db()
        self.assertEqual(membership.role, OrganizationMembership.ROLE_ADMIN)

    def test_owner_cannot_demote_the_only_facility_admin(self):
        owner = self.make_user(
            "people_owner_last_admin", OrganizationMembership.ROLE_OWNER
        )
        member = self.make_user(
            "people_member_last_admin", OrganizationMembership.ROLE_MEMBER
        )
        membership = OrganizationMembership.objects.get(user=member)
        staff = self.add_staff(member, self.admin_staff_role)
        self.client.force_authenticate(user=owner)

        response = self.client.patch(
            f"/v1/organizations/people/{membership.pk}/",
            {
                "facility_ids": [self.facility.pk],
                "admin_facility_ids": [],
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 403)
        staff.refresh_from_db()
        self.assertEqual(staff.role_id, self.admin_staff_role.id)

    def test_owner_cannot_remove_the_only_facility_admin_access(self):
        owner = self.make_user(
            "people_owner_remove_admin", OrganizationMembership.ROLE_OWNER
        )
        member = self.make_user(
            "people_member_remove_admin", OrganizationMembership.ROLE_MEMBER
        )
        membership = OrganizationMembership.objects.get(user=member)
        staff = self.add_staff(member, self.admin_staff_role)
        self.client.force_authenticate(user=owner)

        response = self.client.patch(
            f"/v1/organizations/people/{membership.pk}/",
            {"facility_ids": [], "admin_facility_ids": []},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 403)
        staff.refresh_from_db()
        self.assertTrue(staff.is_active)

    def test_org_admin_cannot_remove_their_own_facility_admin_access(self):
        admin = self.make_user("people_admin_self", OrganizationMembership.ROLE_ADMIN)
        backup = self.make_user(
            "people_admin_backup", OrganizationMembership.ROLE_MEMBER
        )
        membership = OrganizationMembership.objects.get(user=admin)
        staff = self.add_staff(admin, self.admin_staff_role)
        self.add_staff(backup, self.admin_staff_role)
        self.client.force_authenticate(user=admin)

        response = self.client.patch(
            f"/v1/organizations/people/{membership.pk}/",
            {
                "facility_ids": [self.facility.pk],
                "admin_facility_ids": [],
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 403)
        staff.refresh_from_db()
        self.assertEqual(staff.role_id, self.admin_staff_role.id)

    def test_org_admin_can_manage_facility_admins_without_staff_membership(self):
        admin = self.make_user(
            "people_cross_facility_admin", OrganizationMembership.ROLE_ADMIN
        )
        target = self.make_user(
            "people_cross_facility_target", OrganizationMembership.ROLE_MEMBER
        )
        backup = self.make_user(
            "people_cross_facility_backup", OrganizationMembership.ROLE_MEMBER
        )
        membership = OrganizationMembership.objects.get(user=target)
        target_staff = self.add_staff(target, self.admin_staff_role)
        self.add_staff(backup, self.admin_staff_role)
        self.client.force_authenticate(user=admin)

        response = self.client.patch(
            f"/v1/organizations/people/{membership.pk}/",
            {
                "facility_ids": [self.facility.pk],
                "admin_facility_ids": [],
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        target_staff.refresh_from_db()
        self.assertNotEqual(target_staff.role_id, self.admin_staff_role.id)

    def test_org_people_staff_grant_emits_facility_scoped_audit_event(self):
        # Granting the facility admin role through the org People path must
        # produce the same facility-scoped security audit event the facility
        # /staff/ endpoint emits, so a facility admin can see it (the
        # org-membership audit alone is not facility-scoped). Exercised via PATCH
        # to avoid the pre-existing create-response bug (see spawned follow-up).
        from audit.models import AuditEvent

        owner = self.make_user("people_audit_owner", OrganizationMembership.ROLE_OWNER)
        member = self.make_user(
            "people_audit_grantee", OrganizationMembership.ROLE_MEMBER
        )
        membership = OrganizationMembership.objects.get(user=member)
        self.client.force_authenticate(user=owner)

        response = self.client.patch(
            f"/v1/organizations/people/{membership.pk}/",
            {
                "facility_ids": [self.facility.id],
                "admin_facility_ids": [self.facility.id],
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(response.status_code, 200, response.data)

        staff = Staff.objects.get(user=member, facility=self.facility)
        self.assertEqual(staff.role.code, "admin")

        events = AuditEvent.objects.filter(
            app_label="facilities",
            model_name="staff",
            facility=self.facility,
            object_pk=str(staff.pk),
        )
        self.assertTrue(
            events.exists(),
            "expected a facility-scoped staff security audit event",
        )
        event = events.first()
        self.assertEqual(event.metadata.get("via"), "organization_people")

    def deactivate_membership(self, actor, user):
        membership = OrganizationMembership.objects.get(user=user)
        self.client.force_authenticate(user=actor)
        response = self.client.patch(
            f"/v1/organizations/people/{membership.pk}/",
            {"is_active": False},
            format="json",
            HTTP_HOST="localhost:8000",
        )
        membership.refresh_from_db()
        return response, membership

    def test_owner_cannot_deactivate_membership_of_only_facility_admin(self):
        # An inactive membership grants no facility access, so deactivating it
        # must run the same last-administrator guard as a staff change.
        owner = self.make_user("membership_owner", OrganizationMembership.ROLE_OWNER)
        member = self.make_user("membership_admin", OrganizationMembership.ROLE_MEMBER)
        self.add_staff(member, self.admin_staff_role)

        response, membership = self.deactivate_membership(owner, member)

        self.assertEqual(response.status_code, 403)
        self.assertIn("without an administrator", str(response.data["detail"]))
        self.assertTrue(membership.is_active)

    def test_owner_can_deactivate_membership_when_another_admin_remains(self):
        owner = self.make_user("membership_owner_ok", OrganizationMembership.ROLE_OWNER)
        member = self.make_user(
            "membership_admin_ok", OrganizationMembership.ROLE_MEMBER
        )
        backup = self.make_user(
            "membership_backup_ok", OrganizationMembership.ROLE_MEMBER
        )
        self.add_staff(member, self.admin_staff_role)
        self.add_staff(backup, self.admin_staff_role)

        response, membership = self.deactivate_membership(owner, member)

        self.assertEqual(response.status_code, 200)
        self.assertFalse(membership.is_active)

    def test_org_admin_cannot_deactivate_own_membership_while_facility_admin(self):
        admin = self.make_user(
            "membership_self_admin", OrganizationMembership.ROLE_ADMIN
        )
        backup = self.make_user(
            "membership_self_backup", OrganizationMembership.ROLE_MEMBER
        )
        self.add_staff(admin, self.admin_staff_role)
        self.add_staff(backup, self.admin_staff_role)

        response, membership = self.deactivate_membership(admin, admin)

        self.assertEqual(response.status_code, 403)
        self.assertIn("lock you out", str(response.data["detail"]))
        self.assertTrue(membership.is_active)

    def test_owner_can_deactivate_membership_of_archived_facility_admin(self):
        # An inactive facility grants no access, so its sole admin does not
        # block deactivating that person's membership.
        owner = self.make_user(
            "membership_owner_archived", OrganizationMembership.ROLE_OWNER
        )
        member = self.make_user(
            "membership_admin_archived", OrganizationMembership.ROLE_MEMBER
        )
        self.add_staff(member, self.admin_staff_role)
        Facility.objects.filter(pk=self.facility.pk).update(is_active=False)

        response, membership = self.deactivate_membership(owner, member)

        self.assertEqual(response.status_code, 200)
        self.assertFalse(membership.is_active)

    def membership_access_events(self, staff):
        from audit.models import AuditEvent

        return AuditEvent.objects.filter(
            app_label="facilities",
            model_name="staff",
            facility_id=staff.facility_id,
            object_pk=str(staff.pk),
            metadata__changed_fields=["organization_membership_is_active"],
        )

    def make_second_facility(self):
        facility = Facility.objects.create(
            organization=self.organization,
            name="North Clinic",
            timezone="America/New_York",
        )
        return facility, StaffRole.objects.get(facility=facility, code="staff")

    def test_membership_deactivation_emits_facility_event_per_active_staff(self):
        # Deactivating a membership removes facility access without touching
        # Staff rows; each affected facility must get its own audit event.
        owner = self.make_user("access_audit_owner", OrganizationMembership.ROLE_OWNER)
        member = self.make_user(
            "access_audit_member", OrganizationMembership.ROLE_MEMBER
        )
        north, north_staff_role = self.make_second_facility()
        archived = Facility.objects.create(
            organization=self.organization,
            name="Old Clinic",
            timezone="America/New_York",
        )
        former = Facility.objects.create(
            organization=self.organization,
            name="Former Clinic",
            timezone="America/New_York",
        )
        main_staff = self.add_staff(member, self.staff_role)
        north_staff = Staff.objects.create(
            user=member, facility=north, role=north_staff_role, is_active=True
        )
        archived_staff = Staff.objects.create(
            user=member,
            facility=archived,
            role=StaffRole.objects.get(facility=archived, code="staff"),
            is_active=True,
        )
        inactive_staff = Staff.objects.create(
            user=member,
            facility=former,
            role=StaffRole.objects.get(facility=former, code="staff"),
            is_active=False,
        )
        Facility.objects.filter(pk=archived.pk).update(is_active=False)

        response, membership = self.deactivate_membership(owner, member)

        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(membership.is_active)
        for staff in (main_staff, north_staff, archived_staff):
            staff.refresh_from_db()
            self.assertTrue(staff.is_active)
            events = self.membership_access_events(staff)
            self.assertEqual(events.count(), 1)
            event = events.get()
            self.assertEqual(event.action, "update")
            self.assertEqual(event.actor, owner)
            self.assertEqual(
                event.summary,
                f"Facility access removed for {member}: "
                "organization membership deactivated",
            )
            self.assertEqual(event.metadata["previous"], {"membership_is_active": True})
            self.assertEqual(event.metadata["next"], {"membership_is_active": False})
            self.assertTrue(event.metadata["staff_is_active"])
            self.assertEqual(event.metadata["role_id"], staff.role_id)
            self.assertEqual(event.metadata["user_id"], member.pk)
            self.assertEqual(event.metadata["membership_id"], membership.pk)
            self.assertEqual(event.metadata["organization_id"], self.organization.pk)
            self.assertEqual(event.metadata["via"], "organization_people")
        self.assertFalse(self.membership_access_events(inactive_staff).exists())

    def test_membership_reactivation_emits_access_restored_event(self):
        owner = self.make_user(
            "access_restore_owner", OrganizationMembership.ROLE_OWNER
        )
        member = self.make_user(
            "access_restore_member", OrganizationMembership.ROLE_MEMBER
        )
        staff = self.add_staff(member, self.staff_role)
        membership = OrganizationMembership.objects.get(user=member)
        membership.is_active = False
        membership.save(update_fields=["is_active"])
        self.client.force_authenticate(user=owner)

        response = self.client.patch(
            f"/v1/organizations/people/{membership.pk}/",
            {"is_active": True},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200, response.data)
        event = self.membership_access_events(staff).get()
        self.assertEqual(
            event.summary,
            f"Facility access restored for {member}: "
            "organization membership reactivated",
        )
        self.assertEqual(event.metadata["previous"], {"membership_is_active": False})
        self.assertEqual(event.metadata["next"], {"membership_is_active": True})

    def test_membership_patch_without_active_change_emits_no_access_event(self):
        owner = self.make_user("access_noop_owner", OrganizationMembership.ROLE_OWNER)
        member = self.make_user(
            "access_noop_member", OrganizationMembership.ROLE_MEMBER
        )
        staff = self.add_staff(member, self.staff_role)
        membership = OrganizationMembership.objects.get(user=member)
        self.client.force_authenticate(user=owner)

        response = self.client.patch(
            f"/v1/organizations/people/{membership.pk}/",
            {"is_active": True, "first_name": "Renamed"},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(self.membership_access_events(staff).exists())

    def test_blocked_membership_deactivation_emits_no_access_event(self):
        owner = self.make_user("access_block_owner", OrganizationMembership.ROLE_OWNER)
        member = self.make_user(
            "access_block_admin", OrganizationMembership.ROLE_MEMBER
        )
        staff = self.add_staff(member, self.admin_staff_role)

        response, membership = self.deactivate_membership(owner, member)

        self.assertEqual(response.status_code, 403)
        self.assertTrue(membership.is_active)
        self.assertFalse(self.membership_access_events(staff).exists())

    def test_membership_deactivation_with_facility_removal_emits_one_event_each(self):
        # A row dropped via facility_ids already gets its own staff event; the
        # membership event covers only rows still active after the save.
        from audit.models import AuditEvent

        owner = self.make_user("access_combo_owner", OrganizationMembership.ROLE_OWNER)
        member = self.make_user(
            "access_combo_member", OrganizationMembership.ROLE_MEMBER
        )
        north, north_staff_role = self.make_second_facility()
        main_staff = self.add_staff(member, self.staff_role)
        north_staff = Staff.objects.create(
            user=member, facility=north, role=north_staff_role, is_active=True
        )
        membership = OrganizationMembership.objects.get(user=member)
        self.client.force_authenticate(user=owner)

        response = self.client.patch(
            f"/v1/organizations/people/{membership.pk}/",
            {
                "is_active": False,
                "facility_ids": [self.facility.pk],
                "admin_facility_ids": [],
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200, response.data)
        north_staff.refresh_from_db()
        self.assertFalse(north_staff.is_active)
        north_events = AuditEvent.objects.filter(
            app_label="facilities",
            model_name="staff",
            facility=north,
            object_pk=str(north_staff.pk),
        )
        self.assertEqual(north_events.count(), 1)
        self.assertEqual(north_events.get().metadata["changed_fields"], ["is_active"])
        self.assertEqual(self.membership_access_events(main_staff).count(), 1)

    def test_membership_deactivation_with_facility_add_flags_new_row_too(self):
        # A row created in the same PATCH that deactivates the membership grants
        # no access; its "Created" event is paired with an access-removed one.
        from audit.models import AuditEvent

        owner = self.make_user("access_add_owner", OrganizationMembership.ROLE_OWNER)
        member = self.make_user("access_add_member", OrganizationMembership.ROLE_MEMBER)
        north, _ = self.make_second_facility()
        self.add_staff(member, self.staff_role)
        membership = OrganizationMembership.objects.get(user=member)
        self.client.force_authenticate(user=owner)

        response = self.client.patch(
            f"/v1/organizations/people/{membership.pk}/",
            {
                "is_active": False,
                "facility_ids": [self.facility.pk, north.pk],
                "admin_facility_ids": [],
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200, response.data)
        north_staff = Staff.objects.get(user=member, facility=north)
        changed = sorted(
            event.metadata["changed_fields"][0]
            for event in AuditEvent.objects.filter(
                app_label="facilities",
                model_name="staff",
                facility=north,
                object_pk=str(north_staff.pk),
            )
        )
        self.assertEqual(changed, ["Created", "organization_membership_is_active"])

    def deactivated_membership(self, user):
        membership = OrganizationMembership.objects.get(user=user)
        membership.is_active = False
        membership.save(update_fields=["is_active"])
        return membership

    def staff_events(self, staff):
        from audit.models import AuditEvent

        return AuditEvent.objects.filter(
            app_label="facilities",
            model_name="staff",
            facility_id=staff.facility_id,
            object_pk=str(staff.pk),
        )

    def test_membership_reactivation_with_new_facility_creates_staff(self):
        # Regression: the new Staff row used to be saved before the membership,
        # so Staff.clean raised and the PATCH returned 500.
        owner = self.make_user(
            "reactivate_add_owner", OrganizationMembership.ROLE_OWNER
        )
        member = self.make_user(
            "reactivate_add_member", OrganizationMembership.ROLE_MEMBER
        )
        north, _ = self.make_second_facility()
        main_staff = self.add_staff(member, self.staff_role)
        membership = self.deactivated_membership(member)
        self.client.force_authenticate(user=owner)

        response = self.client.patch(
            f"/v1/organizations/people/{membership.pk}/",
            {
                "is_active": True,
                "facility_ids": [self.facility.pk, north.pk],
                "admin_facility_ids": [],
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200, response.data)
        membership.refresh_from_db()
        self.assertTrue(membership.is_active)
        north_staff = Staff.objects.get(user=member, facility=north)
        self.assertTrue(north_staff.is_active)
        self.assertEqual(
            [e.metadata["changed_fields"] for e in self.staff_events(north_staff)],
            [["Created"]],
        )
        self.assertEqual(self.membership_access_events(main_staff).count(), 1)

    def test_membership_reactivation_reactivates_inactive_staff_row(self):
        owner = self.make_user(
            "reactivate_row_owner", OrganizationMembership.ROLE_OWNER
        )
        member = self.make_user(
            "reactivate_row_member", OrganizationMembership.ROLE_MEMBER
        )
        north, north_staff_role = self.make_second_facility()
        north_staff = Staff.objects.create(
            user=member, facility=north, role=north_staff_role, is_active=False
        )
        membership = self.deactivated_membership(member)
        self.client.force_authenticate(user=owner)

        response = self.client.patch(
            f"/v1/organizations/people/{membership.pk}/",
            {
                "is_active": True,
                "facility_ids": [north.pk],
                "admin_facility_ids": [],
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200, response.data)
        north_staff.refresh_from_db()
        self.assertTrue(north_staff.is_active)
        self.assertEqual(
            [e.metadata["changed_fields"] for e in self.staff_events(north_staff)],
            [["is_active"]],
        )

    def test_membership_reactivation_guards_use_pre_request_access(self):
        # The member's admin row grants nothing while the membership is
        # inactive, so dropping it in the reactivating PATCH removes no
        # administrator.
        owner = self.make_user(
            "reactivate_guard_owner", OrganizationMembership.ROLE_OWNER
        )
        member = self.make_user(
            "reactivate_guard_member", OrganizationMembership.ROLE_MEMBER
        )
        north, _ = self.make_second_facility()
        north_admin = Staff.objects.create(
            user=member,
            facility=north,
            role=StaffRole.objects.get(facility=north, code="admin"),
            is_active=True,
        )
        membership = self.deactivated_membership(member)
        self.client.force_authenticate(user=owner)

        response = self.client.patch(
            f"/v1/organizations/people/{membership.pk}/",
            {
                "is_active": True,
                "facility_ids": [self.facility.pk],
                "admin_facility_ids": [],
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200, response.data)
        north_admin.refresh_from_db()
        self.assertFalse(north_admin.is_active)

    def test_inactive_membership_cannot_be_assigned_facilities(self):
        owner = self.make_user(
            "inactive_assign_owner", OrganizationMembership.ROLE_OWNER
        )
        member = self.make_user(
            "inactive_assign_member", OrganizationMembership.ROLE_MEMBER
        )
        north, _ = self.make_second_facility()
        self.add_staff(member, self.staff_role)
        membership = self.deactivated_membership(member)
        self.client.force_authenticate(user=owner)

        response = self.client.patch(
            f"/v1/organizations/people/{membership.pk}/",
            {
                "facility_ids": [self.facility.pk, north.pk],
                "admin_facility_ids": [],
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("is_active", response.data)
        membership.refresh_from_db()
        self.assertFalse(membership.is_active)
        self.assertFalse(Staff.objects.filter(user=member, facility=north).exists())
