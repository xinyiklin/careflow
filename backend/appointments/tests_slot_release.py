"""Portal slot release on clinician delete/cancel, and id query-param guards."""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from facilities.models import AppointmentStatus, Facility, Staff, StaffRole
from organizations.models import Organization, OrganizationMembership
from patients.models import Patient
from users.portal import PatientPortalAccount

from .models import Appointment, BookableSlot

User = get_user_model()


class SlotReleaseTestBase(TestCase):
    def setUp(self):
        self.client = APIClient(HTTP_HOST="localhost:8000")
        self.organization = Organization.objects.create(
            name="Slot Org", slug="slot-org"
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Slot Clinic",
            timezone="America/New_York",
        )
        self.scheduler = User.objects.create_user(
            username="scheduler", password="x", email="scheduler@example.com"
        )
        OrganizationMembership.objects.create(
            user=self.scheduler,
            organization=self.organization,
            role=OrganizationMembership.ROLE_MEMBER,
            is_active=True,
        )
        self.provider = Staff.objects.create(
            user=self.scheduler,
            facility=self.facility,
            role=StaffRole.objects.get(facility=self.facility, code="admin"),
            is_active=True,
            is_default=True,
        )
        self.patient = Patient.objects.create(
            facility=self.facility,
            first_name="Slot",
            last_name="Patient",
            date_of_birth=date(1990, 1, 1),
            gender=self.facility.patient_genders.first(),
        )
        self.portal_user = User.objects.create_user(
            username="slot_portal", password="x", email="slot_portal@example.com"
        )
        PatientPortalAccount.objects.create(user=self.portal_user, patient=self.patient)
        self.pending_status = AppointmentStatus.objects.get(
            facility=self.facility, code="pending"
        )
        self.cancelled_status = AppointmentStatus.objects.get(
            facility=self.facility, code="cancelled"
        )

    def book_slot(self):
        start = timezone.now() + timedelta(days=3)
        appointment_type = self.facility.appointment_types.first()
        appointment = Appointment.objects.create(
            patient=self.patient,
            facility=self.facility,
            appointment_time=start,
            end_time=start + timedelta(minutes=30),
            status=self.pending_status,
            appointment_type=appointment_type,
            rendering_provider=self.provider,
        )
        slot = BookableSlot.objects.create(
            provider=self.provider,
            appointment_type=appointment_type,
            start_time=start,
            end_time=start + timedelta(minutes=30),
            is_booked=True,
            appointment=appointment,
        )
        return appointment, slot


class SlotReleaseTests(SlotReleaseTestBase):
    def test_deleting_appointment_releases_slot(self):
        appointment, slot = self.book_slot()
        self.client.force_authenticate(self.scheduler)
        response = self.client.delete(f"/v1/appointments/{appointment.id}/")
        self.assertEqual(response.status_code, 204)

        slot.refresh_from_db()
        self.assertFalse(slot.is_booked)
        self.assertIsNone(slot.appointment_id)
        response = self.client.delete(f"/v1/appointments/bookable-slots/{slot.id}/")
        self.assertEqual(response.status_code, 204)

    def test_cancelling_appointment_releases_slot(self):
        appointment, slot = self.book_slot()
        self.client.force_authenticate(self.scheduler)
        response = self.client.patch(
            f"/v1/appointments/{appointment.id}/",
            {"status": self.cancelled_status.id},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)

        slot.refresh_from_db()
        self.assertFalse(slot.is_booked)
        self.assertIsNone(slot.appointment_id)

    def test_non_cancel_update_keeps_slot_booked(self):
        appointment, slot = self.book_slot()
        self.client.force_authenticate(self.scheduler)
        response = self.client.patch(
            f"/v1/appointments/{appointment.id}/",
            {"notes": "Bring prior records."},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)

        slot.refresh_from_db()
        self.assertTrue(slot.is_booked)
        self.assertEqual(slot.appointment_id, appointment.id)

    def test_orphaned_booked_slot_can_be_deleted(self):
        appointment, slot = self.book_slot()
        # Bypass the viewset: the SET_NULL foreign key leaves an orphan.
        Appointment.objects.filter(pk=appointment.pk).delete()
        slot.refresh_from_db()
        self.assertTrue(slot.is_booked)
        self.assertIsNone(slot.appointment_id)

        self.client.force_authenticate(self.scheduler)
        response = self.client.delete(f"/v1/appointments/bookable-slots/{slot.id}/")
        self.assertEqual(response.status_code, 204)

    def test_booked_slot_with_live_appointment_cannot_be_deleted(self):
        _appointment, slot = self.book_slot()
        self.client.force_authenticate(self.scheduler)
        response = self.client.delete(f"/v1/appointments/bookable-slots/{slot.id}/")
        self.assertEqual(response.status_code, 403)


class SchedulingQueryParamTests(SlotReleaseTestBase):
    def test_appointment_list_rejects_non_numeric_patient_id(self):
        self.client.force_authenticate(self.scheduler)
        response = self.client.get("/v1/appointments/?patient_id=abc")
        self.assertEqual(response.status_code, 400)
        self.assertIn("patient_id", response.data)

    def test_bookable_slots_reject_non_numeric_provider(self):
        self.client.force_authenticate(self.scheduler)
        response = self.client.get("/v1/appointments/bookable-slots/?provider=abc")
        self.assertEqual(response.status_code, 400)
        self.assertIn("provider", response.data)

    def test_appointment_create_rejects_non_numeric_patient(self):
        self.client.force_authenticate(self.scheduler)
        # "²" passes str.isdigit() but not int(); both must be a 400.
        for bad_id in ("abc", "²"):
            response = self.client.post(
                "/v1/appointments/", {"patient": bad_id}, format="json"
            )
            self.assertEqual(response.status_code, 400, bad_id)
            self.assertIn("patient", response.data)

    def test_portal_types_reject_non_numeric_provider(self):
        self.client.force_authenticate(self.portal_user)
        response = self.client.get(
            "/v1/portal/scheduling/appointment-types/?provider=abc"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("provider", response.data)

    def test_portal_slots_reject_non_numeric_ids(self):
        self.client.force_authenticate(self.portal_user)
        response = self.client.get("/v1/portal/scheduling/slots/?provider=abc&type=1")
        self.assertEqual(response.status_code, 400)
        self.assertIn("provider", response.data)
        response = self.client.get("/v1/portal/scheduling/slots/?provider=1&type=abc")
        self.assertEqual(response.status_code, 400)
        self.assertIn("type", response.data)
