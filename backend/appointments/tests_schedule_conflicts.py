"""Interval and authoritative-save policy using synthetic appointment fixtures."""

from datetime import date, datetime, timedelta, timezone as dt_timezone
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.exceptions import ValidationError

from appointments import tests as legacy_tests
from appointments.models import Appointment, BookableSlot
from appointments.schedule_conflicts import (
    find_schedule_conflicts,
    parse_facility_datetime,
)
from appointments.serializers import AppointmentSerializer
from audit.models import AuditEvent
from facilities.models import AppointmentStatus
from patients.models import Patient
from users.portal import PatientPortalAccount


class SchedulingFixtures:
    def setUp(self):
        legacy_tests.AppointmentViewSetTests.setUp(self)
        self.second_patient = Patient.objects.create(
            facility=self.facility,
            first_name="Second",
            last_name="Synthetic",
            date_of_birth=date(1991, 1, 1),
            gender=self.gender,
        )
        self.start = datetime(
            2027, 4, 22, 10, tzinfo=ZoneInfo(str(self.facility.timezone))
        )

    def appointment(self, **changes):
        fields = dict(
            patient=self.patient,
            facility=self.facility,
            appointment_time=self.start,
            end_time=self.start + timedelta(minutes=30),
            resource=self.resource,
            rendering_provider=self.rendering_provider,
            status=self.status,
            appointment_type=self.appointment_type,
            is_billable=False,
        )
        fields.update(changes)
        return Appointment.objects.create(**fields)

    def payload(self, **changes):
        fields = dict(
            patient=self.second_patient.pk,
            appointment_time=self.start.isoformat(),
            end_time=(self.start + timedelta(minutes=30)).isoformat(),
            resource=self.resource.pk,
            rendering_provider=self.rendering_provider.pk,
            status=self.status.pk,
            appointment_type=self.appointment_type.pk,
            is_billable=False,
        )
        fields.update(changes)
        return fields

    def conflicts(self, start=None, end=None, **changes):
        args = dict(
            resource_id=self.resource.pk,
            rendering_provider_id=self.rendering_provider.pk,
        )
        args.update(changes)
        return find_schedule_conflicts(
            self.facility,
            start or self.start,
            end or self.start + timedelta(minutes=30),
            **args,
        )

    def post(self, payload):
        return self.client.post("/v1/appointments/", payload, format="json")


class ScheduleConflictTests(SchedulingFixtures, TestCase):
    def test_read_and_edit_preserve_second_fold_instant_and_custom_end(self):
        self.facility.timezone = "America/New_York"
        self.facility.save(update_fields=["timezone"])
        start = datetime(2026, 11, 1, 6, 10, tzinfo=dt_timezone.utc)
        end = start + timedelta(minutes=47)
        appointment = self.appointment(appointment_time=start, end_time=end)
        data = AppointmentSerializer(appointment).data
        self.assertEqual(data["appointment_time"], "2026-11-01T01:10")
        self.assertEqual(data["appointment_time_instant"], "2026-11-01T06:10:00Z")
        self.assertEqual(data["end_time_instant"], "2026-11-01T06:57:00Z")
        edit = AppointmentSerializer(
            appointment,
            data={
                "appointment_time": data["appointment_time_instant"],
                "end_time": data["end_time_instant"],
            },
            partial=True,
            context={"facility": self.facility},
        )
        self.assertTrue(edit.is_valid(), edit.errors)
        edited = edit.save()
        self.assertEqual(edited.appointment_time, start)
        self.assertEqual(edited.end_time, end)

    def test_half_open_and_containment(self):
        self.appointment()
        for start, end, expected in [
            (30, 60, 0),
            (15, 45, 1),
            (-15, 45, 1),
            (5, 10, 1),
            (-30, 0, 0),
        ]:
            with self.subTest(start=start, end=end):
                result = self.conflicts(
                    self.start + timedelta(minutes=start),
                    self.start + timedelta(minutes=end),
                )
                self.assertEqual(len(result), expected)

    def test_provider_resource_or_null_self_and_facility(self):
        appointment = self.appointment()
        self.assertEqual(len(self.conflicts(resource_id=None)), 1)
        self.assertEqual(len(self.conflicts(rendering_provider_id=None)), 1)
        self.assertEqual(
            self.conflicts(resource_id=None, rendering_provider_id=None), []
        )
        self.assertEqual(self.conflicts(resource_id=-1, rendering_provider_id=-1), [])
        self.assertEqual(self.conflicts(exclude_appointment_id=appointment.pk), [])
        self.assertEqual(
            find_schedule_conflicts(
                self.other_facility,
                self.start,
                self.start + timedelta(minutes=30),
                resource_id=self.resource.pk,
            ),
            [],
        )

    def test_cancelled_only_does_not_occupy(self):
        for code in ("cancelled", "no_show", "completed", "custom"):
            with self.subTest(code=code):
                status, _ = AppointmentStatus.objects.get_or_create(
                    facility=self.facility, code=code, defaults={"name": code}
                )
                appointment = self.appointment(status=status)
                self.assertEqual(len(self.conflicts()), 0 if code == "cancelled" else 1)
                appointment.delete()

    def test_legacy_null_end_and_invalid_end(self):
        appointment = self.appointment()
        Appointment.objects.filter(pk=appointment.pk).update(end_time=None)
        self.assertEqual(len(self.conflicts()), 1)
        Appointment.objects.filter(pk=appointment.pk).update(end_time=self.start)
        with self.assertRaisesMessage(
            ValidationError, "existing schedule interval is invalid"
        ):
            self.conflicts()
        response = self.post(self.payload(allow_schedule_overlap=True))
        self.assertEqual(response.status_code, 400)

    def test_gap_fold_offset_and_midnight(self):
        with self.assertRaises(ValidationError):
            parse_facility_datetime("2027-03-14T02:30", self.facility)
        first = parse_facility_datetime("2027-11-07T01:30", self.facility)
        second = parse_facility_datetime("2027-11-07T01:30-08:00", self.facility)
        self.assertEqual(second - first, timedelta(hours=1))
        self.assertEqual(first.tzinfo, dt_timezone.utc)
        midnight = self.start.replace(hour=0)
        self.appointment(
            appointment_time=midnight - timedelta(minutes=15),
            end_time=midnight + timedelta(minutes=15),
        )
        self.assertEqual(
            len(self.conflicts(midnight, midnight + timedelta(minutes=30))), 1
        )

    def test_overlap_response_is_private_and_override_is_separate(self):
        self.appointment()
        response = self.post(self.payload(allow_same_day_double_book=True))
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["code"], "schedule_overlap")
        self.assertEqual(
            set(response.data["conflicts"][0]),
            {"start_time", "end_time", "resource", "rendering_provider"},
        )
        self.assertEqual(Appointment.objects.count(), 1)
        response = self.post(self.payload(allow_schedule_overlap=True))
        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            AuditEvent.objects.filter(
                action="create", model_name="appointment"
            ).count(),
            1,
        )

    def test_same_day_confirmation_remains_independent(self):
        self.appointment()
        response = self.post(
            self.payload(patient=self.patient.pk, allow_schedule_overlap=True)
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("duplicate_day_appointment", response.data)
        response = self.post(
            self.payload(
                patient=self.patient.pk,
                allow_schedule_overlap=True,
                allow_same_day_double_book=True,
            )
        )
        self.assertEqual(response.status_code, 201)

    def test_override_accepts_only_json_boolean(self):
        for value in ("true", 1, "false", None, [], {}):
            with self.subTest(value=value):
                response = self.post(self.payload(allow_schedule_overlap=value))
                self.assertEqual(response.status_code, 400)
                self.assertIn("allow_schedule_overlap", response.data)

    def test_unrelated_edit_cancel_restore_and_move(self):
        self.appointment()
        appointment = self.appointment(patient=self.second_patient)
        url = f"/v1/appointments/{appointment.pk}/"
        self.assertEqual(
            self.client.patch(
                url, {"notes": "Synthetic operational update"}, format="json"
            ).status_code,
            200,
        )
        cancelled = self.facility.appointment_statuses.get(code="cancelled")
        self.assertEqual(
            self.client.patch(url, {"status": cancelled.pk}, format="json").status_code,
            200,
        )
        self.assertEqual(
            self.client.patch(
                url, {"status": self.status.pk}, format="json"
            ).status_code,
            409,
        )
        self.assertEqual(
            self.client.patch(
                url,
                {"status": self.status.pk, "allow_schedule_overlap": True},
                format="json",
            ).status_code,
            200,
        )
        response = self.client.patch(
            url,
            {"appointment_time": (self.start + timedelta(minutes=15)).isoformat()},
            format="json",
        )
        self.assertEqual(response.status_code, 409)
        response = self.client.patch(
            url,
            {"appointment_time": (self.start + timedelta(minutes=30)).isoformat()},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        appointment.refresh_from_db()
        self.assertEqual(
            appointment.end_time - appointment.appointment_time, timedelta(minutes=30)
        )

    def test_end_resize_and_assignment_change_recheck(self):
        self.appointment()
        appointment = self.appointment(
            patient=self.second_patient,
            appointment_time=self.start - timedelta(minutes=30),
            end_time=self.start,
        )
        url = f"/v1/appointments/{appointment.pk}/"
        self.assertEqual(
            self.client.patch(
                url,
                {"end_time": (self.start + timedelta(minutes=15)).isoformat()},
                format="json",
            ).status_code,
            409,
        )
        Appointment.objects.filter(pk=appointment.pk).update(
            appointment_time=self.start,
            end_time=self.start + timedelta(minutes=30),
            resource=None,
            rendering_provider=None,
        )
        self.assertEqual(
            self.client.patch(
                url, {"rendering_provider": self.rendering_provider.pk}, format="json"
            ).status_code,
            409,
        )

    def test_portal_cannot_override_and_receives_no_conflict_details(self):
        self.appointment()
        self.rendering_provider.online_scheduling_enabled = True
        self.rendering_provider.save()
        self.appointment_type.bookable_online = True
        self.appointment_type.save()
        slot = BookableSlot.objects.create(
            provider=self.rendering_provider,
            appointment_type=self.appointment_type,
            start_time=self.start,
            end_time=self.start + timedelta(minutes=30),
        )
        user = get_user_model().objects.create_user(username="portal-conflict")
        PatientPortalAccount.objects.create(user=user, patient=self.second_patient)
        self.client.force_authenticate(user)
        response = self.client.post(
            "/v1/portal/scheduling/book/",
            {"slot_id": slot.pk, "allow_schedule_overlap": True},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.data), {"detail"})
        self.assertEqual(
            str(response.data["detail"]),
            "This time is no longer available for online booking.",
        )
        self.assertEqual(Appointment.objects.count(), 1)
        slot.refresh_from_db()
        self.assertFalse(slot.is_booked)
