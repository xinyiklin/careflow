from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.test import APIClient

from audit.models import AuditEvent
from billing.models import OrganizationFeeSchedule
from facilities.access import user_can_access_facility
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

    def test_inactive_role_revokes_facility_access(self):
        OrganizationMembership.objects.filter(user=self.user).update(
            role=OrganizationMembership.ROLE_MEMBER
        )
        role = StaffRole.objects.create(
            facility=self.facility,
            code="temporary",
            name="Temporary",
            security_permissions=get_role_security_template("staff"),
        )
        Staff.objects.create(
            user=self.user,
            facility=self.facility,
            role=role,
            is_active=True,
        )
        StaffRole.objects.filter(pk=role.pk).update(is_active=False)

        self.assertFalse(user_can_access_facility(self.user, self.facility.pk))
        self.assertFalse(
            user_has_facility_permission(
                self.user,
                self.facility.pk,
                "schedule.view",
            )
        )

    def test_inactive_organization_membership_revokes_facility_access(self):
        Staff.objects.create(
            user=self.user,
            facility=self.facility,
            role=StaffRole.objects.get(facility=self.facility, code="staff"),
            is_active=True,
        )
        OrganizationMembership.objects.filter(user=self.user).update(is_active=False)

        self.assertFalse(user_can_access_facility(self.user, self.facility.pk))

    def test_inactive_facility_revokes_staff_access(self):
        Staff.objects.create(
            user=self.user,
            facility=self.facility,
            role=StaffRole.objects.get(facility=self.facility, code="staff"),
            is_active=True,
        )
        Facility.objects.filter(pk=self.facility.pk).update(is_active=False)

        self.assertFalse(user_can_access_facility(self.user, self.facility.pk))

    def test_facility_rejects_fee_schedule_from_another_organization(self):
        other_organization = Organization.objects.create(
            name="Other Health",
            slug="other-health",
        )
        foreign_schedule = OrganizationFeeSchedule.objects.create(
            organization=other_organization,
            name="Other Standard",
            code="other-standard",
        )

        with self.assertRaises(ValidationError):
            Facility.objects.create(
                organization=self.organization,
                name="Invalid schedule clinic",
                fee_schedule=foreign_schedule,
            )

    def test_staff_rejects_fee_schedule_from_another_organization(self):
        other_organization = Organization.objects.create(
            name="Other Staff Health",
            slug="other-staff-health",
        )
        foreign_schedule = OrganizationFeeSchedule.objects.create(
            organization=other_organization,
            name="Other Staff Standard",
            code="other-staff-standard",
        )

        with self.assertRaises(ValidationError):
            Staff.objects.create(
                user=self.user,
                facility=self.facility,
                role=StaffRole.objects.get(facility=self.facility, code="staff"),
                fee_schedule=foreign_schedule,
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
        self.nurse_role = StaffRole.objects.get(facility=self.facility, code="nurse")
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

    def make_member(self, username, org_role, role, security_overrides=None):
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
            role=role,
            is_active=True,
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

    def patch_staff(self, user, staff, payload):
        self.client.force_authenticate(user)
        return self.client.patch(
            f"/v1/facilities/staff/{staff.pk}/?facility_id={self.facility.pk}",
            payload,
            format="json",
            HTTP_HOST="localhost:8000",
        )

    def delete_staff(self, user, staff):
        self.client.force_authenticate(user)
        return self.client.delete(
            f"/v1/facilities/staff/{staff.pk}/?facility_id={self.facility.pk}",
            HTTP_HOST="localhost:8000",
        )

    def create_role(self, user, payload):
        self.client.force_authenticate(user)
        return self.client.post(
            f"/v1/facilities/staff-roles/?facility_id={self.facility.pk}",
            payload,
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

    def test_admin_with_security_manage_can_create_security_bearing_role(self):
        admin = self.make_admin("role_creator", OrganizationMembership.ROLE_MEMBER)
        # "Admin" resolves to the admin self-management template (code is
        # lower-cased for the lookup) while dodging the case-sensitive
        # (facility, code) uniqueness of the seeded "admin" role.
        response = self.create_role(admin, {"code": "Admin", "name": "Backup Admins"})
        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            AuditEvent.objects.filter(
                actor=admin, model_name="staffrole", action="create"
            ).exists()
        )

    def test_limited_admin_cannot_create_security_bearing_role(self):
        admin = self.make_admin(
            "limited_role_creator",
            OrganizationMembership.ROLE_MEMBER,
            security_overrides={"admin.security.manage": False},
        )
        response = self.create_role(admin, {"code": "Admin", "name": "Sneaky Admins"})
        self.assertEqual(response.status_code, 403)
        self.assertFalse(
            StaffRole.objects.filter(
                facility=self.facility, name="Sneaky Admins"
            ).exists()
        )

    def test_limited_admin_can_create_non_security_role(self):
        admin = self.make_admin(
            "limited_role_creator_ok",
            OrganizationMembership.ROLE_MEMBER,
            security_overrides={"admin.security.manage": False},
        )
        response = self.create_role(admin, {"code": "custom", "name": "Custom Role"})
        self.assertEqual(response.status_code, 201)

    def test_limited_admin_cannot_assign_role_granting_security_manage(self):
        admin = self.make_admin(
            "limited_staff_creator",
            OrganizationMembership.ROLE_MEMBER,
            security_overrides={"admin.security.manage": False},
        )
        permissions = get_role_security_template("staff")
        permissions["admin.security.manage"] = True
        security_role = StaffRole.objects.create(
            facility=self.facility,
            code="security_only",
            name="Security only",
            security_permissions=permissions,
        )
        target = User.objects.create_user(
            username="security_only_target",
            password="testpass123",
            email="security-only-target@example.com",
        )
        OrganizationMembership.objects.create(
            user=target,
            organization=self.organization,
            role=OrganizationMembership.ROLE_MEMBER,
        )
        self.client.force_authenticate(admin)

        response = self.client.post(
            f"/v1/facilities/staff/?facility_id={self.facility.pk}",
            {"user_id": target.pk, "role_id": security_role.pk},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(
            Staff.objects.filter(user=target, facility=self.facility).exists()
        )

    def test_staff_membership_user_cannot_be_reassigned(self):
        full_admin = self.make_admin(
            "reassign_full", OrganizationMembership.ROLE_MEMBER
        )
        limited_admin = self.make_admin(
            "reassign_limited",
            OrganizationMembership.ROLE_MEMBER,
            security_overrides={"admin.security.manage": False},
        )
        accomplice = self.make_member(
            "reassign_accomplice", OrganizationMembership.ROLE_MEMBER, self.staff_role
        )
        Staff.objects.filter(user=accomplice).delete()
        target_row = Staff.objects.get(user=full_admin, facility=self.facility)

        response = self.patch_staff(
            limited_admin, target_row, {"user_id": accomplice.pk}
        )

        self.assertEqual(response.status_code, 400)
        target_row.refresh_from_db()
        self.assertEqual(target_row.user_id, full_admin.pk)
        self.assertFalse(AuditEvent.objects.filter(model_name="staff").exists())

    def test_staff_membership_user_cannot_be_reassigned_by_put(self):
        admin = self.make_admin(
            "reassign_put_admin", OrganizationMembership.ROLE_MEMBER
        )
        member = self.make_member(
            "reassign_put_member", OrganizationMembership.ROLE_MEMBER, self.staff_role
        )
        other = self.make_member(
            "reassign_put_other", OrganizationMembership.ROLE_MEMBER, self.staff_role
        )
        Staff.objects.filter(user=other).delete()
        staff = Staff.objects.get(user=member, facility=self.facility)
        self.client.force_authenticate(admin)

        response = self.client.put(
            f"/v1/facilities/staff/{staff.pk}/?facility_id={self.facility.pk}",
            {"user_id": other.pk, "role_id": self.staff_role.pk},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        staff.refresh_from_db()
        self.assertEqual(staff.user_id, member.pk)

    def test_staff_edit_with_unchanged_user_id_succeeds(self):
        admin = self.make_admin("same_user_admin", OrganizationMembership.ROLE_MEMBER)
        member = self.make_member(
            "same_user_member", OrganizationMembership.ROLE_MEMBER, self.staff_role
        )
        staff = Staff.objects.get(user=member, facility=self.facility)

        response = self.patch_staff(
            admin, staff, {"user_id": member.pk, "specialty": "Family medicine"}
        )

        self.assertEqual(response.status_code, 200)
        staff.refresh_from_db()
        self.assertEqual(staff.specialty, "Family medicine")

    def patch_role(self, user, role, payload):
        self.client.force_authenticate(user)
        return self.client.patch(
            f"/v1/facilities/staff-roles/{role.pk}/?facility_id={self.facility.pk}",
            payload,
            format="json",
            HTTP_HOST="localhost:8000",
        )

    def test_limited_admin_cannot_deactivate_role(self):
        limited_admin = self.make_admin(
            "deactivate_limited",
            OrganizationMembership.ROLE_MEMBER,
            security_overrides={"admin.security.manage": False},
        )

        response = self.patch_role(limited_admin, self.nurse_role, {"is_active": False})

        self.assertEqual(response.status_code, 403)
        self.nurse_role.refresh_from_db()
        self.assertTrue(self.nurse_role.is_active)

    def test_limited_admin_can_rename_role(self):
        limited_admin = self.make_admin(
            "rename_limited",
            OrganizationMembership.ROLE_MEMBER,
            security_overrides={"admin.security.manage": False},
        )

        response = self.patch_role(limited_admin, self.nurse_role, {"name": "RN"})

        self.assertEqual(response.status_code, 200)
        self.nurse_role.refresh_from_db()
        self.assertEqual(self.nurse_role.name, "RN")

    def test_cannot_deactivate_own_role(self):
        manager_role = StaffRole.objects.create(
            facility=self.facility,
            code="practice_mgr",
            name="Practice manager",
            security_permissions=get_role_security_template("admin"),
        )
        # An org admin clears the facility-admin gate without the seeded
        # "admin" role code, so it can hold only the custom role.
        manager = self.make_member(
            "deactivate_self", OrganizationMembership.ROLE_ADMIN, manager_role
        )

        response = self.patch_role(manager, manager_role, {"is_active": False})

        self.assertEqual(response.status_code, 403)
        self.assertIn("own role", str(response.data["detail"]))
        manager_role.refresh_from_db()
        self.assertTrue(manager_role.is_active)

    def test_cannot_deactivate_role_held_by_last_administrator(self):
        manager_role = StaffRole.objects.create(
            facility=self.facility,
            code="practice_mgr",
            name="Practice manager",
            security_permissions=get_role_security_template("admin"),
        )
        self.make_member(
            "last_admin_holder", OrganizationMembership.ROLE_MEMBER, manager_role
        )
        # The owner manages security as break-glass while not holding both
        # self-management permissions, so the holder is the last administrator.
        owner = self.make_member(
            "deactivate_owner",
            OrganizationMembership.ROLE_OWNER,
            self.staff_role,
            security_overrides={"admin.facility.manage": True},
        )

        response = self.patch_role(owner, manager_role, {"is_active": False})

        self.assertEqual(response.status_code, 403)
        self.assertIn("without an administrator", str(response.data["detail"]))
        manager_role.refresh_from_db()
        self.assertTrue(manager_role.is_active)

    def test_role_deactivation_is_audited(self):
        admin = self.make_admin("deactivate_audit", OrganizationMembership.ROLE_MEMBER)
        self.make_member(
            "deactivate_audit_nurse",
            OrganizationMembership.ROLE_MEMBER,
            self.nurse_role,
        )

        response = self.patch_role(admin, self.nurse_role, {"is_active": False})

        self.assertEqual(response.status_code, 200)
        self.nurse_role.refresh_from_db()
        self.assertFalse(self.nurse_role.is_active)
        event = AuditEvent.objects.get(
            actor=admin, model_name="staffrole", object_pk=str(self.nurse_role.pk)
        )
        self.assertEqual(event.metadata["changed_fields"], ["Active status"])
        self.assertEqual(event.metadata["previous"], {"is_active": True})
        self.assertEqual(event.metadata["next"], {"is_active": False})
        self.assertEqual(event.metadata["members_affected"], 1)

    def test_combined_role_edit_writes_both_audit_events(self):
        admin = self.make_admin("combined_admin", OrganizationMembership.ROLE_MEMBER)

        response = self.patch_role(
            admin,
            self.nurse_role,
            {
                "is_active": False,
                "security_permissions": get_role_security_template("staff"),
            },
        )

        self.assertEqual(response.status_code, 200)
        changed = sorted(
            event.metadata["changed_fields"][0]
            for event in AuditEvent.objects.filter(
                actor=admin, model_name="staffrole", object_pk=str(self.nurse_role.pk)
            )
        )
        self.assertEqual(changed, ["Active status", "Security permissions"])

    def test_role_reactivation_is_gated_and_audited(self):
        limited_admin = self.make_admin(
            "reactivate_limited",
            OrganizationMembership.ROLE_MEMBER,
            security_overrides={"admin.security.manage": False},
        )
        admin = self.make_admin("reactivate_admin", OrganizationMembership.ROLE_MEMBER)
        StaffRole.objects.filter(pk=self.nurse_role.pk).update(is_active=False)

        denied = self.patch_role(limited_admin, self.nurse_role, {"is_active": True})
        allowed = self.patch_role(admin, self.nurse_role, {"is_active": True})

        self.assertEqual(denied.status_code, 403)
        self.assertEqual(allowed.status_code, 200)
        event = AuditEvent.objects.get(
            actor=admin, model_name="staffrole", object_pk=str(self.nurse_role.pk)
        )
        self.assertEqual(event.metadata["previous"], {"is_active": False})
        self.assertEqual(event.metadata["next"], {"is_active": True})

    def make_break_glass_owner(self, username):
        # The owner manages security as break-glass while not holding both
        # self-management permissions, so it never counts as an administrator.
        return self.make_member(
            username,
            OrganizationMembership.ROLE_OWNER,
            self.staff_role,
            security_overrides={"admin.facility.manage": True},
        )

    def test_overrides_on_deactivated_role_do_not_count_as_administrator(self):
        # The only administrator holds the nurse role and gets both
        # self-management permissions from overrides; an inactive role grants
        # nothing at runtime, overrides included.
        self.make_member(
            "override_admin",
            OrganizationMembership.ROLE_MEMBER,
            self.nurse_role,
            security_overrides={
                "admin.facility.manage": True,
                "admin.security.manage": True,
            },
        )
        owner = self.make_break_glass_owner("override_owner")

        response = self.patch_role(owner, self.nurse_role, {"is_active": False})

        self.assertEqual(response.status_code, 403)
        self.assertIn("without an administrator", str(response.data["detail"]))
        self.nurse_role.refresh_from_db()
        self.assertTrue(self.nurse_role.is_active)

    def test_cannot_assign_self_to_inactive_admin_role(self):
        admin = self.make_admin("inactive_self", OrganizationMembership.ROLE_MEMBER)
        inactive_role = StaffRole.objects.create(
            facility=self.facility,
            code="dormant_admins",
            name="Dormant admins",
            security_permissions=get_role_security_template("admin"),
            is_active=False,
        )
        staff = Staff.objects.get(user=admin, facility=self.facility)

        response = self.patch_staff(admin, staff, {"role_id": inactive_role.pk})

        self.assertEqual(response.status_code, 403)
        staff.refresh_from_db()
        self.assertEqual(staff.role_id, self.admin_role.pk)

    def test_inactive_role_holder_does_not_count_as_administrator(self):
        dormant_role = StaffRole.objects.create(
            facility=self.facility,
            code="dormant_admins",
            name="Dormant admins",
            security_permissions=get_role_security_template("admin"),
        )
        self.make_member(
            "dormant_holder", OrganizationMembership.ROLE_MEMBER, dormant_role
        )
        StaffRole.objects.filter(pk=dormant_role.pk).update(is_active=False)
        last_admin = self.make_admin(
            "effective_admin", OrganizationMembership.ROLE_MEMBER
        )
        owner = self.make_break_glass_owner("dormant_owner")

        response = self.delete_staff(
            owner, Staff.objects.get(user=last_admin, facility=self.facility)
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("without an administrator", str(response.data["detail"]))
        self.assertTrue(
            Staff.objects.get(user=last_admin, facility=self.facility).is_active
        )

    def test_assigned_custom_role_cannot_be_deleted(self):
        admin = self.make_admin(
            "assigned_role_admin", OrganizationMembership.ROLE_MEMBER
        )
        role = StaffRole.objects.create(
            facility=self.facility,
            code="assigned_custom",
            name="Assigned custom",
            security_permissions=get_role_security_template("staff"),
        )
        target = self.make_member(
            "assigned_role_target",
            OrganizationMembership.ROLE_MEMBER,
            role,
        )
        self.client.force_authenticate(admin)

        response = self.client.delete(
            f"/v1/facilities/staff-roles/{role.pk}/?facility_id={self.facility.pk}",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertTrue(Staff.objects.filter(user=target, role=role).exists())
        self.assertTrue(StaffRole.objects.filter(pk=role.pk).exists())

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

    def test_cannot_downgrade_own_role_to_lock_self_out(self):
        # Changing only role_id (no security_overrides) to a lower-privilege role
        # would strip self-management access, so it must be blocked.
        admin = self.make_admin("fac_self_role", OrganizationMembership.ROLE_MEMBER)
        staff = Staff.objects.get(user=admin, facility=self.facility)
        response = self.patch_staff(admin, staff, {"role_id": self.staff_role.pk})
        self.assertEqual(response.status_code, 403)
        staff.refresh_from_db()
        self.assertEqual(staff.role_id, self.admin_role.id)

    def test_cannot_downgrade_own_role_even_with_empty_overrides(self):
        # The combined payload {role_id, security_overrides: {}} must be blocked
        # the same way a role-only downgrade is.
        admin = self.make_admin(
            "fac_self_role_combo", OrganizationMembership.ROLE_MEMBER
        )
        staff = Staff.objects.get(user=admin, facility=self.facility)
        response = self.patch_staff(
            admin,
            staff,
            {"role_id": self.staff_role.pk, "security_overrides": {}},
        )
        self.assertEqual(response.status_code, 403)
        staff.refresh_from_db()
        self.assertEqual(staff.role_id, self.admin_role.id)

    def test_can_change_another_users_role(self):
        # The self-lockout guard must not block managing a different user.
        admin = self.make_admin("fac_actor", OrganizationMembership.ROLE_MEMBER)
        other = self.make_admin("fac_target", OrganizationMembership.ROLE_MEMBER)
        other_staff = Staff.objects.get(user=other, facility=self.facility)
        response = self.patch_staff(admin, other_staff, {"role_id": self.nurse_role.pk})
        self.assertEqual(response.status_code, 200)
        other_staff.refresh_from_db()
        self.assertEqual(other_staff.role_id, self.nurse_role.id)

    def test_cannot_strip_last_admin_by_downgrading_another_staff(self):
        # Break-glass owner (admin.facility.manage but security.manage revoked)
        # is not a full admin, so demoting the only full admin would leave the
        # facility with none — the coverage guard, not the self-lockout guard.
        owner = self.make_admin(
            "fac_owner_strip",
            OrganizationMembership.ROLE_OWNER,
            security_overrides={"admin.security.manage": False},
        )
        last_admin = self.make_admin(
            "fac_last_admin", OrganizationMembership.ROLE_MEMBER
        )
        last_staff = Staff.objects.get(user=last_admin, facility=self.facility)
        response = self.patch_staff(owner, last_staff, {"role_id": self.staff_role.pk})
        self.assertEqual(response.status_code, 403)
        self.assertIn("without an administrator", str(response.data["detail"]))
        last_staff.refresh_from_db()
        self.assertEqual(last_staff.role_id, self.admin_role.id)

    def test_cannot_strip_admin_role_perms_leaving_no_admin(self):
        # Actor holds the role-edit gate (break-glass owner + facility.manage
        # override) but not the admin role, so the self-lockout guard does not
        # apply; stripping the admin role would remove the last full admin.
        owner = self.make_member(
            "fac_owner_role",
            OrganizationMembership.ROLE_OWNER,
            self.staff_role,
            security_overrides={"admin.facility.manage": True},
        )
        self.make_admin("fac_role_last_admin", OrganizationMembership.ROLE_MEMBER)
        stripped = get_role_security_template("admin")
        stripped["admin.facility.manage"] = False
        stripped["admin.security.manage"] = False
        response = self.patch_role_security(owner, self.admin_role, stripped)
        self.assertEqual(response.status_code, 403)
        self.assertIn("without an administrator", str(response.data["detail"]))
        self.admin_role.refresh_from_db()
        self.assertTrue(self.admin_role.security_permissions["admin.facility.manage"])

    def test_cannot_deactivate_self_via_staff_patch(self):
        admin = self.make_admin("fac_self_inactive", OrganizationMembership.ROLE_MEMBER)
        staff = Staff.objects.get(user=admin, facility=self.facility)
        response = self.patch_staff(admin, staff, {"is_active": False})
        self.assertEqual(response.status_code, 403)
        staff.refresh_from_db()
        self.assertTrue(staff.is_active)

    def test_cannot_deactivate_last_admin_via_staff_patch(self):
        owner = self.make_member(
            "fac_owner_deactivate",
            OrganizationMembership.ROLE_OWNER,
            self.staff_role,
            security_overrides={"admin.facility.manage": True},
        )
        last_admin = self.make_admin(
            "fac_last_active_admin", OrganizationMembership.ROLE_MEMBER
        )
        last_staff = Staff.objects.get(user=last_admin, facility=self.facility)

        response = self.patch_staff(owner, last_staff, {"is_active": False})

        self.assertEqual(response.status_code, 403)
        self.assertIn("without an administrator", str(response.data["detail"]))
        last_staff.refresh_from_db()
        self.assertTrue(last_staff.is_active)

    def test_cannot_delete_self_staff_membership(self):
        admin = self.make_admin("fac_self_delete", OrganizationMembership.ROLE_MEMBER)
        staff = Staff.objects.get(user=admin, facility=self.facility)
        response = self.delete_staff(admin, staff)
        self.assertEqual(response.status_code, 403)
        staff.refresh_from_db()
        self.assertTrue(staff.is_active)

    def test_cannot_delete_last_admin_staff_membership(self):
        owner = self.make_member(
            "fac_owner_delete",
            OrganizationMembership.ROLE_OWNER,
            self.staff_role,
            security_overrides={"admin.facility.manage": True},
        )
        last_admin = self.make_admin(
            "fac_last_delete_admin", OrganizationMembership.ROLE_MEMBER
        )
        last_staff = Staff.objects.get(user=last_admin, facility=self.facility)

        response = self.delete_staff(owner, last_staff)

        self.assertEqual(response.status_code, 403)
        self.assertIn("without an administrator", str(response.data["detail"]))
        last_staff.refresh_from_db()
        self.assertTrue(last_staff.is_active)

    def test_can_deactivate_admin_when_another_admin_remains(self):
        actor = self.make_admin(
            "fac_actor_deactivate", OrganizationMembership.ROLE_MEMBER
        )
        target = self.make_admin(
            "fac_target_deactivate", OrganizationMembership.ROLE_MEMBER
        )
        target_staff = Staff.objects.get(user=target, facility=self.facility)

        response = self.patch_staff(actor, target_staff, {"is_active": False})

        self.assertEqual(response.status_code, 200)
        target_staff.refresh_from_db()
        self.assertFalse(target_staff.is_active)
