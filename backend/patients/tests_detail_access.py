"""Patient list filters validate input; detail actions reach deactivated rows."""

from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from audit.models import AuditEvent
from facilities.models import Facility, Staff, StaffRole
from organizations.models import Organization, OrganizationMembership

from .models import Patient

User = get_user_model()


class PatientDetailAccessTests(TestCase):
    def setUp(self):
        self.client = APIClient(HTTP_HOST="localhost:8000")
        self.organization = Organization.objects.create(
            name="Detail Org", slug="detail-org"
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Detail Clinic",
            timezone="America/New_York",
        )
        self.clinician = User.objects.create_user(
            username="detail_admin", password="x", email="detail_admin@example.com"
        )
        OrganizationMembership.objects.create(
            user=self.clinician,
            organization=self.organization,
            role=OrganizationMembership.ROLE_MEMBER,
            is_active=True,
        )
        Staff.objects.create(
            user=self.clinician,
            facility=self.facility,
            role=StaffRole.objects.get(facility=self.facility, code="admin"),
            is_active=True,
            is_default=True,
        )
        self.patient = Patient.objects.create(
            facility=self.facility,
            first_name="Dana",
            last_name="Archer",
            date_of_birth=date(1990, 1, 1),
            gender=self.facility.patient_genders.first(),
        )
        self.client.force_authenticate(self.clinician)

    def test_date_of_birth_filter_rejects_garbage(self):
        response = self.client.get("/v1/patients/?date_of_birth=garbage")
        self.assertEqual(response.status_code, 400)
        self.assertIn("date_of_birth", response.data)

    def test_date_of_birth_filter_accepts_iso_date(self):
        response = self.client.get("/v1/patients/?date_of_birth=1990-01-01")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["id"] for row in response.data], [self.patient.id])

    def test_inactive_patient_is_hidden_from_search(self):
        Patient.objects.filter(pk=self.patient.pk).update(is_active=False)
        response = self.client.get("/v1/patients/?name=Archer")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_inactive_patient_can_be_reactivated(self):
        Patient.objects.filter(pk=self.patient.pk).update(is_active=False)
        response = self.client.patch(
            f"/v1/patients/{self.patient.id}/", {"is_active": True}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.patient.refresh_from_db()
        self.assertTrue(self.patient.is_active)
        self.assertTrue(
            AuditEvent.objects.filter(
                patient=self.patient, summary__startswith="Reactivated patient"
            ).exists()
        )

    def test_deactivating_inactive_patient_is_a_noop(self):
        Patient.objects.filter(pk=self.patient.pk).update(is_active=False)
        before = AuditEvent.objects.filter(patient=self.patient).count()
        response = self.client.delete(f"/v1/patients/{self.patient.id}/")
        self.assertEqual(response.status_code, 204)
        self.assertEqual(
            AuditEvent.objects.filter(patient=self.patient).count(), before
        )
