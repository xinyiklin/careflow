"""Interval-presence API, ownership, and stale-request regression coverage."""

from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from uuid import uuid4

from django.db import close_old_connections, connection
from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from . import tests as appointment_test_fixtures
from .models import AppointmentBookingHold


class BookingHoldTests(TestCase):
    setUp = appointment_test_fixtures.AppointmentViewSetTests.setUp
    create_scheduler_user = (
        appointment_test_fixtures.AppointmentViewSetTests.create_scheduler_user
    )

    def candidate(self, **changes):
        data = {
            "session_id": str(uuid4()),
            "revision": 1,
            "start_time": "2026-09-07T09:00:00-07:00",
            "end_time": "2026-09-07T10:00:00-07:00",
            "resource": self.resource.pk,
            "rendering_provider": self.rendering_provider.pk,
        }
        data.update(changes)
        return data

    def acquire(self, data):
        return self.client.post(
            f"/v1/appointments/booking-hold/?facility_id={self.facility.pk}",
            data,
            format="json",
        )

    def identity(self, data, method="patch"):
        url = f"/v1/appointments/booking-hold/?facility_id={self.facility.pk}"
        identity = {key: data[key] for key in ("session_id", "revision")}
        if method == "delete":
            return self.client.delete(
                f"{url}&session_id={identity['session_id']}&revision={identity['revision']}"
            )
        return self.client.patch(url, identity, format="json")

    def test_overlapping_same_user_tabs_and_provider_only(self):
        first = self.candidate()
        self.assertEqual(self.acquire(first).data["status"], "active")
        second = self.candidate(start_time="2026-09-07T09:30:00-07:00", resource=None)
        response = self.acquire(second)
        self.assertEqual(response.data["status"], "occupied")
        self.assertEqual(
            set(response.data["holders"][0]), {"user_name", "start_time", "end_time"}
        )
        self.assertEqual(str(response.data["session_id"]), second["session_id"])
        self.assertNotIn(first["session_id"], str(response.data))

    def test_half_open_adjacent_and_distinct_assignments(self):
        self.acquire(self.candidate())
        adjacent = self.acquire(
            self.candidate(
                start_time="2026-09-07T10:00:00-07:00",
                end_time="2026-09-07T11:00:00-07:00",
            )
        )
        self.assertEqual(adjacent.data["status"], "active")
        distinct = self.acquire(self.candidate(resource=None, rendering_provider=None))
        self.assertEqual(distinct.data["status"], "active")

    def test_failed_resize_releases_old_interval_and_new_revision_can_acquire(self):
        first = self.candidate()
        self.acquire(first)
        self.acquire(
            self.candidate(
                start_time="2026-09-07T10:00:00-07:00",
                end_time="2026-09-07T11:00:00-07:00",
            )
        )
        resized = {**first, "revision": 2, "end_time": "2026-09-07T10:30:00-07:00"}
        self.assertEqual(self.acquire(resized).data["status"], "occupied")
        hold = AppointmentBookingHold.objects.get(session_id=first["session_id"])
        self.assertFalse(hold.is_active())
        self.assertEqual(self.acquire(self.candidate()).data["status"], "active")
        resized.update(
            revision=3,
            start_time="2026-09-07T11:00:00-07:00",
            end_time="2026-09-07T12:00:00-07:00",
        )
        self.assertEqual(self.acquire(resized).data["status"], "active")

    def test_takeover_revokes_all_overlapping_sessions_only(self):
        first = self.candidate(end_time="2026-09-07T09:30:00-07:00")
        second = self.candidate(start_time="2026-09-07T09:30:00-07:00")
        unrelated = self.candidate(
            start_time="2026-09-07T10:00:00-07:00", end_time="2026-09-07T11:00:00-07:00"
        )
        for data in (first, second, unrelated):
            self.assertEqual(self.acquire(data).data["status"], "active")
        takeover = self.candidate(take_over=True)
        self.assertEqual(self.acquire(takeover).data["status"], "active")
        for data in (first, second):
            self.assertEqual(self.identity(data).data["status"], "revoked")
            self.assertEqual(
                self.acquire({**data, "revision": 8, "take_over": True}).data["status"],
                "revoked",
            )
        self.assertEqual(self.identity(unrelated).data["status"], "active")

    def test_release_before_acquire_and_stale_revisions(self):
        first = self.candidate()
        self.assertEqual(
            self.identity({**first, "revision": 2}, "delete").data["status"], "released"
        )
        self.assertEqual(self.acquire(first).data["status"], "released")
        self.assertEqual(
            self.acquire({**first, "revision": 3}).data["status"], "released"
        )
        second = self.candidate()
        self.acquire(second)
        latest = {**second, "revision": 3, "end_time": "2026-09-07T09:30:00-07:00"}
        self.acquire(latest)
        self.acquire(second)
        stale_release = self.identity({**second, "revision": 2}, "delete")
        self.assertEqual(stale_release.data["status"], "active")
        self.assertEqual(stale_release.data["revision"], 3)
        hold = AppointmentBookingHold.objects.get(session_id=second["session_id"])
        self.assertEqual(hold.end_time.minute, 30)

    def test_heartbeat_cannot_acquire_resize_revive_or_refresh_stale_revision(self):
        first = self.candidate()
        self.assertEqual(self.identity(first).data["status"], "revoked")
        self.assertFalse(AppointmentBookingHold.objects.exists())
        self.acquire(first)
        expired = timezone.now() - timedelta(minutes=6)
        AppointmentBookingHold.objects.filter(session_id=first["session_id"]).update(
            last_seen_at=expired
        )
        self.assertEqual(self.identity(first).data["status"], "revoked")
        self.assertEqual(
            self.acquire({**first, "revision": 2}).data["status"], "revoked"
        )
        second = self.candidate()
        self.acquire(second)
        hold = AppointmentBookingHold.objects.get(session_id=second["session_id"])
        prior = hold.last_seen_at
        self.identity({**second, "revision": 2})
        hold.refresh_from_db()
        self.assertEqual(hold.last_seen_at, prior)
        response = self.client.patch(
            f"/v1/appointments/booking-hold/?facility_id={self.facility.pk}",
            second,
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_wrong_owner_and_facility_mutations_denied(self):
        first = self.candidate()
        self.acquire(first)
        self.client.force_authenticate(self.create_scheduler_user())
        for response in (
            self.acquire(first),
            self.identity(first),
            self.identity({**first, "revision": 2}, "delete"),
        ):
            self.assertEqual(response.status_code, 403)
        self.client.force_authenticate(self.user)
        response = self.client.post(
            f"/v1/appointments/booking-hold/?facility_id={self.other_facility.pk}",
            first,
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_check_is_nonmutating_and_scopes_edit_and_assignments(self):
        url = f"/v1/appointments/schedule-check/?facility_id={self.facility.pk}"
        candidate = self.candidate()
        del candidate["revision"]
        del candidate["session_id"]
        response = self.client.post(url, candidate, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "available")
        self.assertFalse(AppointmentBookingHold.objects.exists())
        self.assertEqual(
            self.client.post(
                url, {**candidate, "appointment_id": 999999}, format="json"
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.post(
                url, {**candidate, "resource": 999999}, format="json"
            ).status_code,
            400,
        )
        self.assertEqual(
            self.acquire(self.candidate(take_over="true")).status_code, 400
        )
        self.assertEqual(
            self.acquire(
                self.candidate(end_time="2026-09-07T08:00:00-07:00")
            ).status_code,
            400,
        )
        self.assertEqual(
            self.acquire(self.candidate(user_id=self.user.pk)).status_code, 400
        )
        self.client = APIClient()
        self.assertEqual(self.acquire(self.candidate()).status_code, 401)

    def test_saved_appointment_warning_does_not_reject_presence(self):
        from .models import Appointment

        Appointment.objects.create(
            facility=self.facility,
            patient=self.patient,
            created_by=self.user,
            appointment_time="2026-09-07T16:00:00Z",
            end_time="2026-09-07T17:00:00Z",
            resource=self.resource,
            rendering_provider=self.rendering_provider,
            status=self.status,
            appointment_type=self.appointment_type,
        )
        response = self.acquire(self.candidate())
        self.assertEqual(response.data["status"], "active")
        self.assertEqual(len(response.data["conflicts"]), 1)
        self.assertEqual(
            set(response.data["conflicts"][0]),
            {"start_time", "end_time", "resource", "rendering_provider"},
        )


class BookingHoldConcurrencyTests(TransactionTestCase):
    setUp = appointment_test_fixtures.AppointmentViewSetTests.setUp
    candidate = BookingHoldTests.candidate
    acquire = BookingHoldTests.acquire

    def race(self, candidates):
        self.assertEqual(connection.vendor, "postgresql")
        barrier = Barrier(len(candidates), timeout=10)
        facility_id, user = self.facility.pk, self.user

        def send(data):
            close_old_connections()
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SET statement_timeout TO '10s'")
                    cursor.execute("SET lock_timeout TO '10s'")
                client = APIClient()
                client.force_authenticate(user)
                barrier.wait()
                response = client.post(
                    f"/v1/appointments/booking-hold/?facility_id={facility_id}",
                    data,
                    format="json",
                )
                return response.status_code, response.data
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=len(candidates)) as executor:
            futures = [executor.submit(send, candidate) for candidate in candidates]
            return [future.result(timeout=20) for future in futures]

    def test_concurrent_first_acquisition_has_one_owner(self):
        responses = self.race(
            [self.candidate(), self.candidate(start_time="2026-09-07T09:30:00-07:00")]
        )
        self.assertEqual(
            sorted(data["status"] for status, data in responses if status == 200),
            ["active", "occupied"],
        )
        self.assertEqual(
            AppointmentBookingHold.objects.filter(state="active").count(), 1
        )

    def test_concurrent_resize_has_one_owner_and_drops_old_intervals(self):
        first = self.candidate(end_time="2026-09-07T09:30:00-07:00")
        second = self.candidate(
            start_time="2026-09-07T10:00:00-07:00", end_time="2026-09-07T11:00:00-07:00"
        )
        for candidate in (first, second):
            self.assertEqual(self.acquire(candidate).data["status"], "active")
        resized = [
            {
                **item,
                "revision": 2,
                "start_time": "2026-09-07T11:00:00-07:00",
                "end_time": "2026-09-07T12:00:00-07:00",
            }
            for item in (first, second)
        ]
        responses = self.race(resized)
        self.assertEqual(
            sorted(data["status"] for status, data in responses if status == 200),
            ["active", "occupied"],
        )
        self.assertEqual(
            AppointmentBookingHold.objects.filter(state="active").count(), 1
        )

    def test_concurrent_takeovers_leave_one_live_owner(self):
        self.acquire(self.candidate())
        responses = self.race(
            [self.candidate(take_over=True), self.candidate(take_over=True)]
        )
        self.assertTrue(all(status == 200 for status, _data in responses))
        self.assertEqual(
            AppointmentBookingHold.objects.filter(state="active").count(), 1
        )
        self.assertEqual(
            AppointmentBookingHold.objects.filter(state="revoked").count(), 2
        )
