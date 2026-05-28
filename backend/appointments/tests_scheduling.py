"""Tests for the online-scheduling resolution helpers and BookableSlot model."""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from appointments.models import Appointment, BookableSlot
from appointments.scheduling import (
    cancellation_allowed,
    cancellation_cutoff_for,
    cancellation_window_open,
    slot_auto_confirms,
    slot_offered,
)
from facilities.models import (
    AppointmentStatus,
    AppointmentType,
    Facility,
    Staff,
    StaffRole,
)
from organizations.models import Organization, OrganizationMembership
from patients.models import Patient

User = get_user_model()


class SchedulingTestMixin:
    def setUp(self):
        super().setUp()
        self.organization = Organization.objects.create(
            name="Scheduling Test Org", slug="sched-org"
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Scheduling Clinic",
            timezone="America/Los_Angeles",
        )
        self.provider_user = User.objects.create_user(
            username="dr_sched",
            password="x",
            email="dr_sched@example.com",
            first_name="Sched",
            last_name="Doctor",
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
        )
        self.appt_type = AppointmentType.objects.get(
            facility=self.facility, code="follow_up"
        )

    def _future(self, hours=24):
        return timezone.now() + timedelta(hours=hours)


class BookableSlotModelTests(SchedulingTestMixin, TestCase):
    def test_create_slot_with_valid_data(self):
        start = self._future(24)
        slot = BookableSlot.objects.create(
            provider=self.provider,
            appointment_type=self.appt_type,
            start_time=start,
            end_time=start + timedelta(minutes=30),
        )
        self.assertFalse(slot.is_booked)
        self.assertIsNone(slot.appointment_id)

    def test_rejects_end_before_start(self):
        start = self._future(24)
        with self.assertRaises(ValidationError) as ctx:
            BookableSlot.objects.create(
                provider=self.provider,
                appointment_type=self.appt_type,
                start_time=start,
                end_time=start,
            )
        self.assertIn("end_time", ctx.exception.message_dict)

    def test_rejects_type_from_other_facility(self):
        other_facility = Facility.objects.create(
            organization=self.organization,
            name="Other Clinic",
            timezone="America/Los_Angeles",
        )
        other_type = AppointmentType.objects.get(
            facility=other_facility, code="follow_up"
        )
        start = self._future(24)
        with self.assertRaises(ValidationError) as ctx:
            BookableSlot.objects.create(
                provider=self.provider,
                appointment_type=other_type,
                start_time=start,
                end_time=start + timedelta(minutes=30),
            )
        self.assertIn("appointment_type", ctx.exception.message_dict)

    def test_booked_requires_appointment(self):
        start = self._future(24)
        slot = BookableSlot(
            provider=self.provider,
            appointment_type=self.appt_type,
            start_time=start,
            end_time=start + timedelta(minutes=30),
            is_booked=True,
        )
        with self.assertRaises(ValidationError) as ctx:
            slot.full_clean()
        self.assertIn("appointment", ctx.exception.message_dict)


class SlotOfferedTests(SchedulingTestMixin, TestCase):
    def _make_slot(self):
        start = self._future(24)
        return BookableSlot.objects.create(
            provider=self.provider,
            appointment_type=self.appt_type,
            start_time=start,
            end_time=start + timedelta(minutes=30),
        )

    def test_offered_when_all_toggles_on(self):
        self.provider.online_scheduling_enabled = True
        self.provider.save()
        self.appt_type.bookable_online = True
        self.appt_type.save()
        slot = self._make_slot()
        self.assertTrue(slot_offered(slot))

    def test_hidden_when_facility_kill_switch_on(self):
        self.provider.online_scheduling_enabled = True
        self.provider.save()
        self.appt_type.bookable_online = True
        self.appt_type.save()
        self.facility.online_scheduling_disabled = True
        self.facility.save()
        slot = self._make_slot()
        slot.provider.refresh_from_db()
        self.assertFalse(slot_offered(slot))

    def test_hidden_when_provider_not_opted_in(self):
        self.appt_type.bookable_online = True
        self.appt_type.save()
        slot = self._make_slot()
        self.assertFalse(slot_offered(slot))

    def test_hidden_when_type_not_bookable(self):
        self.provider.online_scheduling_enabled = True
        self.provider.save()
        slot = self._make_slot()
        self.assertFalse(slot_offered(slot))

    def test_hidden_when_slot_already_booked(self):
        self.provider.online_scheduling_enabled = True
        self.provider.save()
        self.appt_type.bookable_online = True
        self.appt_type.save()
        slot = self._make_slot()
        slot.is_booked = True
        # Bypass full_clean for this test (real flow sets appointment)
        BookableSlot.objects.filter(pk=slot.pk).update(is_booked=True)
        slot.refresh_from_db()
        self.assertFalse(slot_offered(slot))

    def test_hidden_when_slot_in_past(self):
        self.provider.online_scheduling_enabled = True
        self.provider.save()
        self.appt_type.bookable_online = True
        self.appt_type.save()
        past = timezone.now() - timedelta(hours=1)
        BookableSlot.objects.filter().delete()
        slot = BookableSlot(
            provider=self.provider,
            appointment_type=self.appt_type,
            start_time=past,
            end_time=past + timedelta(minutes=30),
        )
        # Skip clean since start in past — write directly to DB
        BookableSlot.objects.bulk_create([slot])
        slot.refresh_from_db()
        self.assertFalse(slot_offered(slot))


class SlotAutoConfirmsTests(SchedulingTestMixin, TestCase):
    def _make_slot(self):
        start = self._future(24)
        return BookableSlot.objects.create(
            provider=self.provider,
            appointment_type=self.appt_type,
            start_time=start,
            end_time=start + timedelta(minutes=30),
        )

    def test_confirms_only_when_both_opt_in(self):
        cases = [
            (False, False, False),
            (True, False, False),
            (False, True, False),
            (True, True, True),
        ]
        slot = self._make_slot()
        for provider_flag, type_flag, expected in cases:
            self.provider.auto_confirm_bookings = provider_flag
            self.provider.save()
            self.appt_type.auto_confirm_bookings = type_flag
            self.appt_type.save()
            slot.provider.refresh_from_db()
            slot.appointment_type.refresh_from_db()
            self.assertEqual(
                slot_auto_confirms(slot),
                expected,
                f"provider={provider_flag} type={type_flag}",
            )


class CancellationTests(SchedulingTestMixin, TestCase):
    def setUp(self):
        super().setUp()
        gender = self.facility.patient_genders.first()
        self.patient = Patient.objects.create(
            facility=self.facility,
            first_name="Cancel",
            last_name="Patient",
            date_of_birth=date(1990, 1, 1),
            gender=gender,
        )
        self.pending_status = AppointmentStatus.objects.get(
            facility=self.facility, code="pending"
        )
        self.appointment = Appointment.objects.create(
            patient=self.patient,
            facility=self.facility,
            appointment_time=self._future(48),
            end_time=self._future(48) + timedelta(minutes=30),
            status=self.pending_status,
            appointment_type=self.appt_type,
            rendering_provider=self.provider,
        )

    def test_cancellation_blocked_when_both_disabled(self):
        self.assertFalse(cancellation_allowed(self.appointment))

    def test_cancellation_blocked_when_only_facility_enabled(self):
        self.facility.online_cancellation_enabled = True
        self.facility.save()
        self.assertFalse(cancellation_allowed(self.appointment))

    def test_cancellation_allowed_when_both_enabled(self):
        self.facility.online_cancellation_enabled = True
        self.facility.save()
        self.provider.online_cancellation_enabled = True
        self.provider.save()
        self.appointment.refresh_from_db()
        self.assertTrue(cancellation_allowed(self.appointment))

    def test_cutoff_uses_largest_value(self):
        self.facility.cancellation_cutoff_hours = 12
        self.facility.save()
        self.provider.cancellation_cutoff_hours = 48
        self.provider.save()
        self.appointment.refresh_from_db()
        self.assertEqual(cancellation_cutoff_for(self.appointment), 48)

    def test_cancellation_window_respects_cutoff(self):
        self.facility.online_cancellation_enabled = True
        self.facility.cancellation_cutoff_hours = 24
        self.facility.save()
        self.provider.online_cancellation_enabled = True
        self.provider.cancellation_cutoff_hours = 24
        self.provider.save()
        # Appointment is 48h out; 24h cutoff → window is open
        self.appointment.refresh_from_db()
        self.assertTrue(cancellation_window_open(self.appointment))

        # Move appointment to 12h out; 24h cutoff → window closed
        self.appointment.appointment_time = self._future(12)
        self.appointment.end_time = self._future(12) + timedelta(minutes=30)
        self.appointment.save()
        self.assertFalse(cancellation_window_open(self.appointment))
