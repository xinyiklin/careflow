from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from facilities.models import AppointmentStatus, Facility, Staff, StaffRole
from facilities.security import user_has_facility_permission
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
