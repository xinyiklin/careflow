"""Independent PostgreSQL connections exercise actual scheduling transactions."""

from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from datetime import timedelta
from threading import Barrier, Event
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import connection, connections
from django.test import TransactionTestCase
from rest_framework.test import APIClient

from appointments import portal_scheduling_views, views
from appointments.models import Appointment, BookableSlot
from appointments.schedule_conflicts import facility_schedule_lock
from appointments.tests_schedule_conflicts import SchedulingFixtures
from clinical import views as clinical_views
from clinical.models import Encounter
from users.portal import PatientPortalAccount


class ScheduleConcurrencyTests(SchedulingFixtures, TransactionTestCase):
    def setUp(self):
        super().setUp()
        self.assertEqual(connection.vendor, "postgresql")
        with connection.cursor() as cursor:
            cursor.execute("SHOW transaction_isolation")
            self.assertEqual(cursor.fetchone()[0], "read committed")

    def request(self, user, method, url, data=None):
        client = APIClient()
        client.force_authenticate(user)
        response = getattr(client, method)(url, data or {}, format="json")
        return response.status_code

    def parallel(self, *actions):
        def execute(action):
            connections.close_all()
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SET lock_timeout = '5s'")
                    cursor.execute("SET statement_timeout = '10s'")
                return action()
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=len(actions)) as pool:
            futures = [pool.submit(execute, action) for action in actions]
            return [future.result(timeout=15) for future in futures]

    def race(self, *actions):
        barrier = Barrier(len(actions), timeout=10)

        @contextmanager
        def synchronized_lock(facility):
            barrier.wait()
            with facility_schedule_lock(facility):
                yield

        with (
            patch.object(views, "facility_schedule_lock", synchronized_lock),
            patch.object(
                portal_scheduling_views, "facility_schedule_lock", synchronized_lock
            ),
        ):
            return self.parallel(*actions)

    def create(self, patient, **changes):
        payload = self.payload(patient=patient.pk, **changes)
        return lambda: self.request(self.user, "post", "/v1/appointments/", payload)

    def portal_setup(self):
        self.rendering_provider.online_scheduling_enabled = True
        self.rendering_provider.save()
        self.appointment_type.bookable_online = True
        self.appointment_type.save()
        users = []
        for index, patient in enumerate((self.patient, self.second_patient)):
            user = get_user_model().objects.create_user(
                username=f"portal-race-{index}",
                email=f"portal-race-{index}@example.com",
            )
            PatientPortalAccount.objects.create(user=user, patient=patient)
            users.append(user)
        return users

    def slot(self, offset=0):
        return BookableSlot.objects.create(
            provider=self.rendering_provider,
            appointment_type=self.appointment_type,
            start_time=self.start + timedelta(minutes=offset),
            end_time=self.start + timedelta(minutes=offset + 30),
        )

    def book(self, user, slot):
        return lambda: self.request(
            user, "post", "/v1/portal/scheduling/book/", {"slot_id": slot.pk}
        )

    def test_clinician_same_resource_has_one_winner(self):
        results = self.race(
            self.create(self.patient, rendering_provider=None),
            self.create(self.second_patient, rendering_provider=None),
        )
        self.assertEqual(sorted(results), [201, 409])
        self.assertEqual(Appointment.objects.count(), 1)

    def test_clinician_provider_only_has_one_winner(self):
        results = self.race(
            self.create(self.patient, resource=None), self.create(self.second_patient)
        )
        self.assertEqual(sorted(results), [201, 409])
        self.assertEqual(Appointment.objects.count(), 1)

    def test_overlapping_distinct_portal_slots_have_one_winner(self):
        first_user, second_user = self.portal_setup()
        first, second = self.slot(), self.slot(15)
        results = self.race(
            self.book(first_user, first), self.book(second_user, second)
        )
        self.assertEqual(sorted(results), [201, 400])
        self.assertEqual(Appointment.objects.count(), 1)
        self.assertEqual(BookableSlot.objects.filter(is_booked=True).count(), 1)

    def test_clinician_portal_provider_race_has_one_winner(self):
        first_user, _ = self.portal_setup()
        slot = self.slot(15)
        results = self.race(
            self.book(first_user, slot), self.create(self.second_patient)
        )
        self.assertEqual(sum(result == 201 for result in results), 1)
        self.assertTrue(all(result in (201, 400, 409) for result in results))
        self.assertEqual(Appointment.objects.count(), 1)

    def test_adjacent_saves_both_succeed(self):
        results = self.race(
            self.create(self.patient),
            self.create(
                self.second_patient,
                appointment_time=(self.start + timedelta(minutes=30)).isoformat(),
                end_time=(self.start + timedelta(minutes=60)).isoformat(),
            ),
        )
        self.assertEqual(results, [201, 201])
        self.assertEqual(Appointment.objects.count(), 2)

    def test_move_and_new_booking_have_one_winner(self):
        appointment = self.appointment(
            appointment_time=self.start + timedelta(hours=2),
            end_time=self.start + timedelta(hours=2, minutes=30),
        )
        results = self.race(
            lambda: self.request(
                self.user,
                "patch",
                f"/v1/appointments/{appointment.pk}/",
                {"appointment_time": self.start.isoformat()},
            ),
            self.create(self.second_patient),
        )
        self.assertEqual(sum(result in (200, 201) for result in results), 1)
        self.assertIn(409, results)
        self.assertEqual(
            Appointment.objects.filter(appointment_time=self.start).count(), 1
        )

    def test_restoration_and_new_booking_have_one_winner(self):
        cancelled = self.facility.appointment_statuses.get(code="cancelled")
        appointment = self.appointment(status=cancelled)
        results = self.race(
            lambda: self.request(
                self.user,
                "patch",
                f"/v1/appointments/{appointment.pk}/",
                {"status": self.status.pk},
            ),
            self.create(self.second_patient),
        )
        self.assertEqual(sum(result in (200, 201) for result in results), 1)
        self.assertIn(409, results)
        self.assertEqual(
            Appointment.objects.exclude(status__code="cancelled").count(), 1
        )

    def test_cancellation_and_booking_preserve_order(self):
        cancelled = self.facility.appointment_statuses.get(code="cancelled")
        appointment = self.appointment()
        results = self.race(
            lambda: self.request(
                self.user,
                "patch",
                f"/v1/appointments/{appointment.pk}/",
                {"status": cancelled.pk},
            ),
            self.create(self.second_patient),
        )
        self.assertEqual(results[0], 200)
        self.assertIn(results[1], (201, 409))
        appointment.refresh_from_db()
        self.assertEqual(appointment.status_id, cancelled.pk)
        self.assertLessEqual(
            Appointment.objects.exclude(status__code="cancelled").count(), 1
        )

    def test_delete_and_booking_preserve_order(self):
        appointment = self.appointment()
        results = self.race(
            lambda: self.request(
                self.user, "delete", f"/v1/appointments/{appointment.pk}/"
            ),
            self.create(self.second_patient),
        )
        self.assertEqual(results[0], 204)
        self.assertIn(results[1], (201, 409))
        self.assertFalse(Appointment.objects.filter(pk=appointment.pk).exists())
        self.assertLessEqual(Appointment.objects.count(), 1)

    def test_portal_cancellation_and_rebooking_preserve_slot(self):
        first_user, second_user = self.portal_setup()
        self.facility.online_cancellation_enabled = True
        self.facility.save()
        self.rendering_provider.online_cancellation_enabled = True
        self.rendering_provider.save()
        appointment = self.appointment()
        slot = self.slot()
        slot.is_booked = True
        slot.appointment = appointment
        slot.save()
        results = self.race(
            lambda: self.request(
                first_user,
                "post",
                f"/v1/portal/appointments/{appointment.pk}/cancel/",
            ),
            self.book(second_user, slot),
        )
        self.assertEqual(results[0], 200)
        self.assertIn(results[1], (201, 400))
        appointment.refresh_from_db()
        slot.refresh_from_db()
        self.assertEqual(appointment.status.code, "cancelled")
        self.assertEqual(slot.is_booked, results[1] == 201)
        self.assertNotEqual(slot.appointment_id, appointment.pk)

    def test_encounter_foreign_keys_do_not_deadlock_schedule_update(self):
        appointment = self.appointment()
        appointment_locked = Event()
        scheduler_ready = Event()
        original_queryset = views.AppointmentViewSet.get_queryset

        def observed_queryset(view):
            if getattr(view, "_lock_appointment_for_write", False):
                scheduler_ready.set()
            return original_queryset(view)

        original_create = clinical_views.EncounterViewSet.perform_create

        def paused_create(view, serializer):
            appointment_locked.set()
            if not scheduler_ready.wait(10):
                raise AssertionError(
                    "Scheduling request did not reach appointment lock"
                )
            return original_create(view, serializer)

        def encounter_create():
            return self.request(
                self.user,
                "post",
                f"/v1/clinical/encounters/?facility_id={self.facility.pk}",
                {
                    "patient": self.patient.pk,
                    "appointment": appointment.pk,
                    "rendering_provider": self.rendering_provider.pk,
                    "reason": "Synthetic encounter",
                },
            )

        def schedule_update():
            if not appointment_locked.wait(10):
                raise AssertionError(
                    "Encounter request did not acquire appointment lock"
                )
            return self.request(
                self.user,
                "patch",
                f"/v1/appointments/{appointment.pk}/",
                {"notes": "Synthetic change"},
            )

        with (
            patch.object(views.AppointmentViewSet, "get_queryset", observed_queryset),
            patch.object(
                clinical_views.EncounterViewSet, "perform_create", paused_create
            ),
        ):
            self.assertEqual(
                self.parallel(encounter_create, schedule_update), [201, 200]
            )
        self.assertEqual(Encounter.objects.filter(appointment=appointment).count(), 1)
