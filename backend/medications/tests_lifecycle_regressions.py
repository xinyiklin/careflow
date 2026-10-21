"""Discontinue and refill-resolution behavior around medication status."""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from facilities.models import Facility, Staff, StaffRole
from organizations.models import Organization, OrganizationMembership
from patients.models import Patient
from users.portal import PatientPortalAccount

from .models import Medication, RefillRequest

User = get_user_model()


class MedicationLifecycleTests(TestCase):
    def setUp(self):
        self.client = APIClient(HTTP_HOST="localhost:8000")
        self.organization = Organization.objects.create(
            name="Lifecycle Org", slug="lifecycle-org"
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Lifecycle Clinic",
            timezone="America/New_York",
        )
        self.clinician = User.objects.create_user(
            username="prescriber", password="x", email="prescriber@example.com"
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
            first_name="Refill",
            last_name="Patient",
            date_of_birth=date(1985, 3, 3),
            gender=self.facility.patient_genders.first(),
        )
        self.portal_user = User.objects.create_user(
            username="refill_portal", password="x", email="refill_portal@example.com"
        )
        PatientPortalAccount.objects.create(user=self.portal_user, patient=self.patient)

    def make_medication(self, **overrides):
        data = {
            "patient": self.patient,
            "facility": self.facility,
            "medication_name": "Lisinopril",
            "dose": "10 mg",
            "route": "PO",
            "frequency": "Daily",
        }
        data.update(overrides)
        return Medication.objects.create(**data)

    def make_pending_refill(self, medication):
        return RefillRequest.objects.create(
            medication=medication,
            patient=self.patient,
            facility=self.facility,
            days_supply=30,
        )

    def test_discontinue_future_start_medication_ends_on_start_date(self):
        start = timezone.localdate() + timedelta(days=30)
        medication = self.make_medication(start_date=start)
        self.client.force_authenticate(self.clinician)
        response = self.client.delete(f"/v1/medications/{medication.id}/")
        self.assertEqual(response.status_code, 204)

        medication.refresh_from_db()
        self.assertEqual(medication.status, Medication.STATUS_DISCONTINUED)
        self.assertEqual(medication.end_date, start)

    def test_discontinue_started_medication_ends_today(self):
        medication = self.make_medication(
            start_date=timezone.localdate() - timedelta(days=10)
        )
        self.client.force_authenticate(self.clinician)
        response = self.client.delete(f"/v1/medications/{medication.id}/")
        self.assertEqual(response.status_code, 204)

        medication.refresh_from_db()
        self.assertEqual(medication.end_date, timezone.localdate())

    def test_refill_for_discontinued_medication_cannot_be_approved(self):
        medication = self.make_medication()
        refill = self.make_pending_refill(medication)
        medication.discontinue(user=self.clinician)

        self.client.force_authenticate(self.clinician)
        response = self.client.post(
            f"/v1/medications/refill-requests/{refill.id}/approve/", {}, format="json"
        )
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("medication", response.data)
        refill.refresh_from_db()
        self.assertEqual(refill.status, RefillRequest.STATUS_PENDING)

    def test_refill_for_active_medication_can_be_approved(self):
        medication = self.make_medication()
        refill = self.make_pending_refill(medication)

        self.client.force_authenticate(self.clinician)
        response = self.client.post(
            f"/v1/medications/refill-requests/{refill.id}/approve/", {}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.data)
        refill.refresh_from_db()
        self.assertEqual(refill.status, RefillRequest.STATUS_APPROVED)

    def test_refill_for_discontinued_medication_can_be_denied(self):
        medication = self.make_medication()
        refill = self.make_pending_refill(medication)
        medication.discontinue(user=self.clinician)

        self.client.force_authenticate(self.clinician)
        response = self.client.post(
            f"/v1/medications/refill-requests/{refill.id}/deny/",
            {"clinician_note": "Medication discontinued."},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        refill.refresh_from_db()
        self.assertEqual(refill.status, RefillRequest.STATUS_DENIED)

    def test_portal_can_cancel_refill_for_discontinued_medication(self):
        medication = self.make_medication()
        refill = self.make_pending_refill(medication)
        medication.discontinue(user=self.clinician)

        self.client.force_authenticate(self.portal_user)
        response = self.client.post(
            f"/v1/portal/refill-requests/{refill.id}/cancel/", {}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.data)
        refill.refresh_from_db()
        self.assertEqual(refill.status, RefillRequest.STATUS_CANCELLED)

    def test_new_refill_still_requires_active_medication(self):
        medication = self.make_medication()
        medication.discontinue(user=self.clinician)
        with self.assertRaises(DjangoValidationError):
            self.make_pending_refill(medication)
