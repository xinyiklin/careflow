"""Integration tests for portal online-scheduling endpoints."""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from appointments.models import Appointment, BookableSlot
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

User = get_user_model()


class PortalSchedulingTestMixin:
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.organization = Organization.objects.create(
            name="Portal Sched Org", slug="portal-sched"
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Sched Clinic",
            timezone="America/Los_Angeles",
        )

        # Provider
        self.provider_user = User.objects.create_user(
            username="dr_p",
            password="x",
            email="dr_p@example.com",
            first_name="Pat",
            last_name="Provider",
        )
        OrganizationMembership.objects.create(
            user=self.provider_user,
            organization=self.organization,
            role=OrganizationMembership.ROLE_MEMBER,
            is_active=True,
        )
        self.provider = Staff.objects.create(
            user=self.provider_user,
            facility=self.facility,
            role=StaffRole.objects.get(facility=self.facility, code="physician"),
            title=self.facility.titles.get(code="md"),
            is_active=True,
            is_default=True,
            online_scheduling_enabled=True,
            online_cancellation_enabled=True,
            cancellation_cutoff_hours=24,
        )

        # Type
        self.appt_type = AppointmentType.objects.get(
            facility=self.facility, code="follow_up"
        )
        self.appt_type.bookable_online = True
        self.appt_type.save()

        # Statuses (default seed includes them, but ensure)
        AppointmentStatus.objects.get_or_create(
            facility=self.facility,
            code="confirmed",
            defaults={"name": "Confirmed", "is_active": True},
        )
        AppointmentStatus.objects.get_or_create(
            facility=self.facility,
            code="pending",
            defaults={"name": "Pending", "is_active": True},
        )
        AppointmentStatus.objects.get_or_create(
            facility=self.facility,
            code="cancelled",
            defaults={"name": "Cancelled", "is_active": True},
        )

        # Patient + portal account
        gender = self.facility.patient_genders.first()
        self.patient = Patient.objects.create(
            facility=self.facility,
            first_name="Pat",
            last_name="Patient",
            date_of_birth=date(1990, 1, 1),
            gender=gender,
        )
        self.portal_user = User.objects.create_user(
            username="portal_p", password="x", email="portal_p@example.com"
        )
        PatientPortalAccount.objects.create(user=self.portal_user, patient=self.patient)

    def _make_slot(self, hours_ahead=24):
        start = timezone.now() + timedelta(hours=hours_ahead)
        return BookableSlot.objects.create(
            provider=self.provider,
            appointment_type=self.appt_type,
            start_time=start,
            end_time=start + timedelta(minutes=30),
        )


class ProvidersAndTypesEndpointTests(PortalSchedulingTestMixin, TestCase):
    def test_anonymous_rejected(self):
        response = self.client.get("/v1/portal/scheduling/providers/")
        self.assertEqual(response.status_code, 401)

    def test_lists_provider_with_open_slot(self):
        self._make_slot()
        self.client.force_authenticate(self.portal_user)
        response = self.client.get("/v1/portal/scheduling/providers/")
        self.assertEqual(response.status_code, 200)
        ids = [p["id"] for p in response.data]
        self.assertEqual(ids, [self.provider.id])

    def test_hides_provider_when_facility_killswitch_on(self):
        self.facility.online_scheduling_disabled = True
        self.facility.save()
        self._make_slot()
        self.client.force_authenticate(self.portal_user)
        response = self.client.get("/v1/portal/scheduling/providers/")
        self.assertEqual(response.data, [])

    def test_lists_type_for_provider(self):
        self._make_slot()
        self.client.force_authenticate(self.portal_user)
        response = self.client.get(
            f"/v1/portal/scheduling/appointment-types/?provider={self.provider.id}"
        )
        self.assertEqual(response.status_code, 200)
        ids = [t["id"] for t in response.data]
        self.assertEqual(ids, [self.appt_type.id])


class SlotsAndBookingTests(PortalSchedulingTestMixin, TestCase):
    def test_lists_open_slots(self):
        slot = self._make_slot()
        self.client.force_authenticate(self.portal_user)
        response = self.client.get(
            f"/v1/portal/scheduling/slots/"
            f"?provider={self.provider.id}&type={self.appt_type.id}"
        )
        self.assertEqual(response.status_code, 200)
        ids = [s["id"] for s in response.data]
        self.assertEqual(ids, [slot.id])

    def test_book_creates_pending_when_auto_confirm_off(self):
        slot = self._make_slot()
        self.client.force_authenticate(self.portal_user)
        response = self.client.post(
            "/v1/portal/scheduling/book/",
            {"slot_id": slot.id, "reason": "Cough"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status_code"], "pending")
        slot.refresh_from_db()
        self.assertTrue(slot.is_booked)
        self.assertIsNotNone(slot.appointment_id)

    def test_book_creates_confirmed_when_both_auto_confirm_on(self):
        self.provider.auto_confirm_bookings = True
        self.provider.save()
        self.appt_type.auto_confirm_bookings = True
        self.appt_type.save()
        slot = self._make_slot()
        self.client.force_authenticate(self.portal_user)
        response = self.client.post(
            "/v1/portal/scheduling/book/",
            {"slot_id": slot.id},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status_code"], "confirmed")

    def test_book_rejects_slot_not_in_my_facility(self):
        other_facility = Facility.objects.create(
            organization=self.organization,
            name="Other Clinic",
            timezone="America/Los_Angeles",
        )
        other_user = User.objects.create_user(
            username="dr_other",
            password="x",
            email="dr_other@example.com",
        )
        OrganizationMembership.objects.create(
            user=other_user,
            organization=self.organization,
            role=OrganizationMembership.ROLE_MEMBER,
            is_active=True,
        )
        other_provider = Staff.objects.create(
            user=other_user,
            facility=other_facility,
            role=StaffRole.objects.get(facility=other_facility, code="physician"),
            title=other_facility.titles.get(code="md"),
            is_active=True,
            online_scheduling_enabled=True,
        )
        other_type = AppointmentType.objects.get(
            facility=other_facility, code="follow_up"
        )
        other_type.bookable_online = True
        other_type.save()
        start = timezone.now() + timedelta(hours=24)
        other_slot = BookableSlot.objects.create(
            provider=other_provider,
            appointment_type=other_type,
            start_time=start,
            end_time=start + timedelta(minutes=30),
        )

        self.client.force_authenticate(self.portal_user)
        response = self.client.post(
            "/v1/portal/scheduling/book/",
            {"slot_id": other_slot.id},
            format="json",
        )
        self.assertEqual(response.status_code, 404)

    def test_double_booking_rejected(self):
        slot = self._make_slot()
        self.client.force_authenticate(self.portal_user)
        # First booking
        first = self.client.post(
            "/v1/portal/scheduling/book/",
            {"slot_id": slot.id},
            format="json",
        )
        self.assertEqual(first.status_code, 201)
        # Second booking
        second = self.client.post(
            "/v1/portal/scheduling/book/",
            {"slot_id": slot.id},
            format="json",
        )
        self.assertEqual(second.status_code, 400)


class CancelEndpointTests(PortalSchedulingTestMixin, TestCase):
    def _book(self, hours_ahead=48):
        self.facility.online_cancellation_enabled = True
        self.facility.cancellation_cutoff_hours = 24
        self.facility.save()
        self.provider.online_cancellation_enabled = True
        self.provider.cancellation_cutoff_hours = 24
        self.provider.save()
        self.appt_type.refresh_from_db()
        slot = self._make_slot(hours_ahead=hours_ahead)
        self.client.force_authenticate(self.portal_user)
        response = self.client.post(
            "/v1/portal/scheduling/book/",
            {"slot_id": slot.id},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        return response.data["id"], slot

    def test_cancel_within_window(self):
        appointment_id, slot = self._book(hours_ahead=48)
        response = self.client.post(f"/v1/portal/appointments/{appointment_id}/cancel/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status_code"], "cancelled")
        slot.refresh_from_db()
        self.assertFalse(slot.is_booked)
        self.assertIsNone(slot.appointment_id)

    def test_cancel_outside_window_rejected(self):
        appointment_id, _ = self._book(hours_ahead=48)
        # Move the appointment to be within 12h
        appt = Appointment.objects.get(pk=appointment_id)
        appt.appointment_time = timezone.now() + timedelta(hours=12)
        appt.end_time = appt.appointment_time + timedelta(minutes=30)
        appt.save()

        response = self.client.post(f"/v1/portal/appointments/{appointment_id}/cancel/")
        self.assertEqual(response.status_code, 400)

    def test_cancel_rejected_when_facility_disables_cancellation(self):
        appointment_id, _ = self._book(hours_ahead=48)
        self.facility.online_cancellation_enabled = False
        self.facility.save()
        response = self.client.post(f"/v1/portal/appointments/{appointment_id}/cancel/")
        self.assertEqual(response.status_code, 400)

    def test_cancel_other_patient_appointment_returns_404(self):
        appointment_id, _ = self._book(hours_ahead=48)
        other_user = User.objects.create_user(
            username="other_portal",
            password="x",
            email="other_portal@example.com",
        )
        other_patient = Patient.objects.create(
            facility=self.facility,
            first_name="Other",
            last_name="Person",
            date_of_birth=date(1985, 2, 2),
            gender=self.facility.patient_genders.first(),
        )
        PatientPortalAccount.objects.create(user=other_user, patient=other_patient)
        self.client.force_authenticate(other_user)
        response = self.client.post(f"/v1/portal/appointments/{appointment_id}/cancel/")
        self.assertEqual(response.status_code, 404)
