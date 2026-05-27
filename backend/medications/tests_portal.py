from datetime import date

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from facilities.models import Facility, Staff, StaffRole
from organizations.models import Organization, OrganizationMembership
from patients.models import Patient
from users.portal import PatientPortalAccount

from .models import Medication

User = get_user_model()


class PortalMedicationListViewTests(APITestCase):
    """End-to-end tests for ``GET /v1/portal/medications/``."""

    URL = "/v1/portal/medications/"

    def setUp(self):
        self.organization = Organization.objects.create(
            name="Portal Meds Org",
            slug="portal-meds-org",
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Portal Meds Clinic",
            timezone="America/New_York",
        )
        gender = self.facility.patient_genders.first()
        self.patient_a = Patient.objects.create(
            facility=self.facility,
            first_name="Alice",
            last_name="Anderson",
            date_of_birth=date(1980, 1, 1),
            gender=gender,
        )
        self.patient_b = Patient.objects.create(
            facility=self.facility,
            first_name="Bob",
            last_name="Brown",
            date_of_birth=date(1985, 2, 2),
            gender=gender,
        )

        self.portal_user_a = User.objects.create_user(
            username="portal_a",
            password="testpass123",
            email="portal_a@example.com",
        )
        PatientPortalAccount.objects.create(
            user=self.portal_user_a,
            patient=self.patient_a,
        )
        self.portal_user_b = User.objects.create_user(
            username="portal_b",
            password="testpass123",
            email="portal_b@example.com",
        )
        PatientPortalAccount.objects.create(
            user=self.portal_user_b,
            patient=self.patient_b,
        )

        self.inactive_a = Medication.objects.create(
            patient=self.patient_a,
            facility=self.facility,
            status=Medication.STATUS_INACTIVE,
            medication_name="Old Med",
            dose="5 mg",
            route="PO",
            frequency="Daily",
        )
        self.active_a = Medication.objects.create(
            patient=self.patient_a,
            facility=self.facility,
            status=Medication.STATUS_ACTIVE,
            medication_name="Lisinopril",
            dose="10 mg",
            route="PO",
            frequency="Daily",
            prescriber_name="Dr. Chen",
        )
        self.active_b = Medication.objects.create(
            patient=self.patient_b,
            facility=self.facility,
            status=Medication.STATUS_ACTIVE,
            medication_name="Metformin",
            dose="500 mg",
            route="PO",
            frequency="BID",
        )

    def _make_clinician_user(self):
        user = User.objects.create_user(
            username="clinician_user",
            password="testpass123",
            email="clinician@example.com",
        )
        OrganizationMembership.objects.create(
            user=user,
            organization=self.organization,
            role=OrganizationMembership.ROLE_MEMBER,
            is_active=True,
        )
        Staff.objects.create(
            user=user,
            facility=self.facility,
            role=StaffRole.objects.get(facility=self.facility, code="staff"),
            is_active=True,
        )
        return user

    def test_anonymous_request_returns_401(self):
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 401)

    def test_clinician_without_portal_account_returns_403(self):
        self.client.force_authenticate(self._make_clinician_user())
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 403)

    def test_inactive_portal_account_returns_403(self):
        user = User.objects.create_user(
            username="portal_inactive",
            password="testpass123",
            email="inactive@example.com",
        )
        patient = Patient.objects.create(
            facility=self.facility,
            first_name="Inactive",
            last_name="Patient",
            date_of_birth=date(1970, 3, 3),
            gender=self.facility.patient_genders.first(),
        )
        PatientPortalAccount.objects.create(
            user=user,
            patient=patient,
            is_active=False,
        )
        self.client.force_authenticate(user)
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 403)

    def test_returns_only_own_medications_active_first(self):
        self.client.force_authenticate(self.portal_user_a)

        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        ids = [row["id"] for row in data]

        # Active first, then inactive.
        self.assertEqual(ids, [self.active_a.id, self.inactive_a.id])
        self.assertNotIn(self.active_b.id, ids)

    def test_does_not_leak_other_patients_medications(self):
        self.client.force_authenticate(self.portal_user_a)

        response = self.client.get(self.URL)
        ids = {row["id"] for row in response.json()}

        self.assertNotIn(self.active_b.id, ids)

    def test_portal_medication_serializer_excludes_clinician_fields(self):
        self.client.force_authenticate(self.portal_user_a)

        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data, "Expected at least one medication")

        forbidden = {
            "created_by",
            "created_by_name",
            "updated_by",
            "updated_by_name",
            "facility",
            "patient_chart_number",
        }
        leaked = forbidden & set(data[0].keys())
        self.assertFalse(
            leaked,
            f"Portal medication response must not expose: {sorted(leaked)}",
        )
