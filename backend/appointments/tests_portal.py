from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from facilities.models import (
    AppointmentStatus,
    AppointmentType,
    Facility,
    Staff,
    StaffRole,
)
from organizations.models import Organization, OrganizationMembership
from patients.models import Patient
from users.portal import PatientPortalAccount

from .models import Appointment

User = get_user_model()


class PortalAppointmentListViewTests(APITestCase):
    """End-to-end tests for ``GET /v1/portal/appointments/``."""

    URL = "/v1/portal/appointments/"

    def setUp(self):
        self.organization = Organization.objects.create(
            name="Portal Appt Org",
            slug="portal-appt-org",
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Portal Appt Clinic",
            timezone="America/New_York",
        )
        self.status = AppointmentStatus.objects.get(
            facility=self.facility, code="pending"
        )
        self.appointment_type = AppointmentType.objects.get(
            facility=self.facility, code="follow_up"
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

        now = timezone.now()
        self.upcoming_a = self._make_appt(self.patient_a, now + timedelta(days=2))
        self.upcoming_a_later = self._make_appt(
            self.patient_a, now + timedelta(days=10)
        )
        self.past_a_recent = self._make_appt(self.patient_a, now - timedelta(days=30))
        self.past_a_old = self._make_appt(self.patient_a, now - timedelta(days=200))
        self.past_a_too_old = self._make_appt(self.patient_a, now - timedelta(days=400))
        self.upcoming_b = self._make_appt(self.patient_b, now + timedelta(days=5))

    def _make_appt(self, patient, when):
        return Appointment.objects.create(
            patient=patient,
            facility=self.facility,
            appointment_time=when,
            status=self.status,
            appointment_type=self.appointment_type,
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
        clinician = self._make_clinician_user()
        self.client.force_authenticate(clinician)

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

    def test_default_returns_only_own_upcoming_ordered_asc(self):
        self.client.force_authenticate(self.portal_user_a)

        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        ids = [item["id"] for item in data]

        self.assertEqual(ids, [self.upcoming_a.id, self.upcoming_a_later.id])
        self.assertNotIn(self.upcoming_b.id, ids)
        self.assertNotIn(self.past_a_recent.id, ids)

    def test_past_returns_past_year_only_ordered_desc(self):
        self.client.force_authenticate(self.portal_user_a)

        response = self.client.get(self.URL, {"past": "true"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        ids = [item["id"] for item in data]

        self.assertEqual(ids, [self.past_a_recent.id, self.past_a_old.id])
        self.assertNotIn(self.past_a_too_old.id, ids)
        self.assertNotIn(self.upcoming_a.id, ids)
        self.assertNotIn(self.upcoming_b.id, ids)

    def test_does_not_leak_other_patients_appointments(self):
        self.client.force_authenticate(self.portal_user_a)

        upcoming = self.client.get(self.URL).json()
        past = self.client.get(self.URL, {"past": "true"}).json()

        for record in upcoming + past:
            self.assertNotEqual(record["id"], self.upcoming_b.id)

    def test_portal_appointment_serializer_excludes_clinician_fields(self):
        self.client.force_authenticate(self.portal_user_a)

        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data, "Expected at least one upcoming appointment")

        forbidden = {
            "created_by",
            "created_by_name",
            "rendering_provider",
            "patient_chart_number",
            "patient_date_of_birth",
        }
        leaked = forbidden & set(data[0].keys())
        self.assertFalse(
            leaked,
            f"Portal appointment response must not expose: {sorted(leaked)}",
        )
