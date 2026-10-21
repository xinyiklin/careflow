"""Facility catalog writes answer duplicates and bad values with a 400."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from organizations.models import Organization, OrganizationMembership

from .models import Facility, Staff, StaffRole

User = get_user_model()


class CatalogValidationTests(TestCase):
    def setUp(self):
        self.client = APIClient(HTTP_HOST="localhost:8000")
        self.organization = Organization.objects.create(
            name="Catalog Org", slug="catalog-org"
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Catalog Clinic",
            timezone="America/New_York",
        )
        self.owner = User.objects.create_user(
            username="catalog_owner", password="x", email="catalog_owner@example.com"
        )
        OrganizationMembership.objects.create(
            user=self.owner,
            organization=self.organization,
            role=OrganizationMembership.ROLE_OWNER,
            is_active=True,
        )
        self.admin = User.objects.create_user(
            username="catalog_admin", password="x", email="catalog_admin@example.com"
        )
        OrganizationMembership.objects.create(
            user=self.admin,
            organization=self.organization,
            role=OrganizationMembership.ROLE_MEMBER,
            is_active=True,
        )
        Staff.objects.create(
            user=self.admin,
            facility=self.facility,
            role=StaffRole.objects.get(facility=self.facility, code="admin"),
            is_active=True,
            is_default=True,
        )

    def post(self, url, payload, user=None):
        self.client.force_authenticate(user or self.admin)
        return self.client.post(url, payload, format="json")

    def assert_rejected(self, response, field):
        self.assertEqual(response.status_code, 400, getattr(response, "data", None))
        self.assertIn(field, response.data)

    def test_duplicate_appointment_status_code_is_rejected(self):
        existing = self.facility.appointment_statuses.first()
        response = self.post(
            "/v1/facilities/appointment-statuses/",
            {"code": existing.code, "name": "Duplicate", "color": "#000000"},
        )
        self.assert_rejected(response, "code")

    def test_duplicate_appointment_type_code_is_rejected(self):
        existing = self.facility.appointment_types.first()
        response = self.post(
            "/v1/facilities/appointment-types/",
            {"code": existing.code, "name": "Duplicate", "color": "#000000"},
        )
        self.assert_rejected(response, "code")

    def test_duplicate_staff_role_code_is_rejected(self):
        response = self.post(
            "/v1/facilities/staff-roles/", {"code": "nurse", "name": "Nurse 2"}
        )
        self.assert_rejected(response, "code")

    def test_duplicate_staff_title_code_is_rejected(self):
        response = self.post(
            "/v1/facilities/staff-titles/", {"code": "md", "name": "MD2"}
        )
        self.assert_rejected(response, "code")

    def test_duplicate_patient_gender_code_is_rejected(self):
        response = self.post(
            "/v1/facilities/patient-genders/", {"code": "male", "name": "Male 2"}
        )
        self.assert_rejected(response, "code")

    def test_update_may_keep_its_own_code(self):
        existing = self.facility.appointment_statuses.first()
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/v1/facilities/appointment-statuses/{existing.id}/",
            {"code": existing.code, "name": "Renamed"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)

    def test_duplicate_staff_membership_is_rejected(self):
        nurse_role = StaffRole.objects.get(facility=self.facility, code="nurse")
        response = self.post(
            "/v1/facilities/staff/",
            {"user_id": self.admin.id, "role_id": nurse_role.id},
        )
        self.assert_rejected(response, "user_id")

    def test_invalid_facility_timezone_is_rejected(self):
        response = self.post(
            "/v1/facilities/",
            {"name": "Mars Clinic", "timezone": "Mars/Olympus"},
            user=self.owner,
        )
        self.assert_rejected(response, "timezone")

    def test_valid_facility_timezone_is_accepted(self):
        response = self.post(
            "/v1/facilities/",
            {"name": "Denver Clinic", "timezone": "America/Denver"},
            user=self.owner,
        )
        self.assertEqual(response.status_code, 201, response.data)
