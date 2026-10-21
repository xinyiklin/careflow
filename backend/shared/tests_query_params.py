"""List filters that take ids reject malformed values instead of raising."""

from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from facilities.models import Facility, Staff, StaffRole
from organizations.models import Organization, OrganizationMembership
from patients.models import Patient

User = get_user_model()


class IdQueryParamTests(TestCase):
    def setUp(self):
        self.client = APIClient(HTTP_HOST="localhost:8000")
        organization = Organization.objects.create(name="Param Org", slug="param-org")
        self.facility = Facility.objects.create(
            organization=organization, name="Param Clinic", timezone="America/New_York"
        )
        clinician = User.objects.create_user(
            username="param_admin", password="x", email="param_admin@example.com"
        )
        OrganizationMembership.objects.create(
            user=clinician,
            organization=organization,
            role=OrganizationMembership.ROLE_MEMBER,
            is_active=True,
        )
        Staff.objects.create(
            user=clinician,
            facility=self.facility,
            role=StaffRole.objects.get(facility=self.facility, code="admin"),
            is_active=True,
            is_default=True,
        )
        Patient.objects.create(
            facility=self.facility,
            first_name="Param",
            last_name="Patient",
            date_of_birth=date(1990, 1, 1),
            gender=self.facility.patient_genders.first(),
        )
        self.client.force_authenticate(clinician)

    def test_insurance_policies_reject_non_numeric_patient_id(self):
        response = self.client.get("/v1/insurance/policies/?patient_id=abc")
        self.assertEqual(response.status_code, 400)
        self.assertIn("patient_id", response.data)

    def test_audit_events_reject_non_numeric_facility(self):
        response = self.client.get("/v1/audit/events/?facility=abc")
        self.assertEqual(response.status_code, 400)
        self.assertIn("facility", response.data)

    def test_audit_events_reject_non_numeric_patient(self):
        response = self.client.get(
            f"/v1/audit/events/?facility={self.facility.id}&patient=abc"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("patient", response.data)
