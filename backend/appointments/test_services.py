from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.test import TestCase

from audit.models import AuditEvent

from .tests_schedule_conflicts import SchedulingFixtures


class AppointmentServiceRegressionTests(SchedulingFixtures, TestCase):
    def assert_update_history(self, field, value, label):
        appointment = self.appointment(room="101")
        url = f"/v1/appointments/{appointment.pk}/"

        for expected in ([label], []):
            response = self.client.patch(url, {field: value}, format="json")
            self.assertEqual(response.status_code, 200)
            event = AuditEvent.objects.filter(
                model_name="appointment", object_pk=str(appointment.pk), action="update"
            ).latest("id")
            self.assertEqual(event.metadata["changed_fields"], expected)
            history = self.client.get(f"{url}history/")
            self.assertEqual(history.status_code, 200)
            entry = next(
                item for item in history.data if item["id"] == f"audit-{event.pk}"
            )
            self.assertEqual(entry["changed_fields"], expected)

    def test_end_time_only_edit_and_unchanged_repeat_are_audited(self):
        self.assert_update_history(
            "end_time", (self.start + timedelta(minutes=45)).isoformat(), "End time"
        )

    def test_room_only_edit_and_unchanged_repeat_are_audited(self):
        self.assert_update_history("room", "102", "Room")

    def test_heatmap_rejects_unrepresentable_month_boundaries(self):
        for month, timezone_name in (
            ("9999-12", "America/New_York"),
            ("0001-01", "Asia/Tokyo"),
        ):
            with self.subTest(month=month, timezone=timezone_name):
                self.facility.timezone = timezone_name
                self.facility.save(update_fields=["timezone"])
                response = self.client.get(
                    "/v1/appointments/heatmap/", {"month": month}
                )
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.data["month"], "Use YYYY-MM for month.")

    def test_heatmap_december_keeps_facility_local_year_boundary(self):
        start = datetime(2026, 12, 31, 23, 30, tzinfo=ZoneInfo("America/Los_Angeles"))
        for offset in (0, 30):
            self.appointment(
                appointment_time=start + timedelta(minutes=offset),
                end_time=start + timedelta(minutes=offset + 30),
            )
        response = self.client.get("/v1/appointments/heatmap/", {"month": "2026-12"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["counts"], {"2026-12-31": 1})
