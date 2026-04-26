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
