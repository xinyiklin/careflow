from datetime import date, datetime, timedelta
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from appointments.models import (
    Appointment,
    AppointmentEditSession,
    AppointmentSlotHold,
)
from audit.models import AuditEvent
from clinical.models import Encounter, ProgressNote
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


class AppointmentViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.organization = Organization.objects.create(
            name="CareFlow Health",
            slug="careflow-health",
        )
        self.user = User.objects.create_user(
            username="scheduler",
            password="testpass123",
            email="scheduler@example.com",
            first_name="Schedule",
            last_name="User",
        )
        OrganizationMembership.objects.create(
            user=self.user,
            organization=self.organization,
            role=OrganizationMembership.ROLE_ADMIN,
            is_active=True,
        )

        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Main Clinic",
            timezone="America/Los_Angeles",
        )
        self.other_facility = Facility.objects.create(
            organization=self.organization,
            name="North Clinic",
            timezone="America/New_York",
        )

        self.staff_membership = Staff.objects.create(
            user=self.user,
            facility=self.facility,
            role=StaffRole.objects.get(facility=self.facility, code="admin"),
            is_active=True,
            is_default=True,
        )
        self.provider_user = User.objects.create_user(
            username="provider",
            password="testpass123",
            email="provider@example.com",
            first_name="Riley",
            last_name="Provider",
        )
        OrganizationMembership.objects.create(
            user=self.provider_user,
            organization=self.organization,
            role=OrganizationMembership.ROLE_MEMBER,
            is_active=True,
        )
        self.rendering_provider = Staff.objects.create(
            user=self.provider_user,
            facility=self.facility,
            role=StaffRole.objects.get(facility=self.facility, code="physician"),
            title=self.facility.titles.get(code="md"),
            is_active=True,
        )

        self.gender = self.facility.patient_genders.first()
        self.status = AppointmentStatus.objects.get(
            facility=self.facility,
            code="pending",
        )
        self.appointment_type = AppointmentType.objects.get(
            facility=self.facility,
            code="follow_up",
        )
        self.resource = self.rendering_provider.resource
        self.resource.default_room = "201"
        self.resource.save(update_fields=["default_room"])
        self.patient = Patient.objects.create(
            facility=self.facility,
            first_name="Mia",
            last_name="Martinez",
            date_of_birth=date(1990, 4, 1),
            gender=self.gender,
        )

        self.client.force_authenticate(self.user)

    def create_appointment(self, *, local_time):
        return Appointment.objects.create(
            patient=self.patient,
            rendering_provider=self.rendering_provider,
            appointment_time=local_time.astimezone(ZoneInfo("UTC")),
            room="101",
            reason="Follow up",
            status=self.status,
            appointment_type=self.appointment_type,
            facility=self.facility,
            created_by=self.user,
        )

    def create_scheduler_user(self, username="second-scheduler"):
        user = User.objects.create_user(
            username=username,
            password="testpass123",
            email=f"{username}@example.com",
            first_name="Second",
            last_name="Scheduler",
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
            role=StaffRole.objects.get(facility=self.facility, code="admin"),
            is_active=True,
        )
        return user

    def test_list_filters_by_facility_local_date_range(self):
        facility_tz = ZoneInfo(str(self.facility.timezone))

        excluded_previous_day = self.create_appointment(
            local_time=datetime(2026, 4, 21, 23, 30, tzinfo=facility_tz),
        )
        included_start_of_day = self.create_appointment(
            local_time=datetime(2026, 4, 22, 9, 0, tzinfo=facility_tz),
        )
        included_end_of_day = self.create_appointment(
            local_time=datetime(2026, 4, 22, 23, 30, tzinfo=facility_tz),
        )

        response = self.client.get(
            "/v1/appointments/",
            {"date": "2026-04-22", "date_to": "2026-04-22"},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        returned_ids = {item["id"] for item in response.data}
        self.assertNotIn(excluded_previous_day.id, returned_ids)
        self.assertIn(included_start_of_day.id, returned_ids)
        self.assertIn(included_end_of_day.id, returned_ids)

    def test_list_rejects_invalid_date_filter(self):
        response = self.client.get(
            "/v1/appointments/",
            {"date": "04-22-2026"},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["date"],
            "Use YYYY-MM-DD for date and date_to.",
        )

    def test_list_rejects_explicit_facility_without_membership(self):
        response = self.client.get(
            "/v1/appointments/",
            {"facility_id": self.other_facility.id},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.data["detail"],
            "You do not have access to this facility.",
        )

    def test_heatmap_returns_monthly_counts_by_facility_local_date(self):
        facility_tz = ZoneInfo(str(self.facility.timezone))

        self.create_appointment(
            local_time=datetime(2026, 4, 22, 9, 0, tzinfo=facility_tz),
        )
        self.create_appointment(
            local_time=datetime(2026, 4, 22, 15, 30, tzinfo=facility_tz),
        )
        self.create_appointment(
            local_time=datetime(2026, 4, 30, 23, 30, tzinfo=facility_tz),
        )
        self.create_appointment(
            local_time=datetime(2026, 5, 1, 8, 0, tzinfo=facility_tz),
        )

        response = self.client.get(
            "/v1/appointments/heatmap/",
            {"facility_id": self.facility.id, "month": "2026-04"},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["month"], "2026-04")
        self.assertEqual(response.data["counts"]["2026-04-22"], 2)
        self.assertEqual(response.data["counts"]["2026-04-30"], 1)
        self.assertNotIn("2026-05-01", response.data["counts"])

    def test_heatmap_rejects_invalid_month(self):
        response = self.client.get(
            "/v1/appointments/heatmap/",
            {"facility_id": self.facility.id, "month": "04-2026"},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["month"], "Use YYYY-MM for month.")

    def test_create_defaults_facility_from_staff_context(self):
        response = self.client.post(
            "/v1/appointments/",
            {
                "patient": self.patient.id,
                "appointment_time": "2026-04-22T09:30",
                "reason": "Follow up",
                "status": self.status.id,
                "appointment_type": self.appointment_type.id,
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 201)
        appointment = Appointment.objects.get(id=response.data["id"])
        self.assertEqual(appointment.facility_id, self.facility.id)
        self.assertEqual(response.data["appointment_time"], "2026-04-22T09:30")

    def test_create_rejects_same_patient_same_facility_local_day_duplicate(self):
        facility_tz = ZoneInfo(str(self.facility.timezone))
        self.create_appointment(
            local_time=datetime(2026, 4, 22, 9, 0, tzinfo=facility_tz),
        )

        response = self.client.post(
            "/v1/appointments/",
            {
                "patient": self.patient.id,
                "appointment_time": "2026-04-22T14:30",
                "reason": "Follow up",
                "status": self.status.id,
                "appointment_type": self.appointment_type.id,
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("duplicate_day_appointment", response.data)

    def test_create_defaults_room_from_resource_when_blank(self):
        response = self.client.post(
            "/v1/appointments/",
            {
                "patient": self.patient.id,
                "resource": self.resource.id,
                "appointment_time": "2026-04-22T10:00",
                "reason": "Follow up",
                "status": self.status.id,
                "appointment_type": self.appointment_type.id,
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 201)
        appointment = Appointment.objects.get(id=response.data["id"])
        self.assertEqual(appointment.room, "201")
        self.assertEqual(response.data["room"], "201")

    def test_create_accepts_custom_end_time(self):
        response = self.client.post(
            "/v1/appointments/",
            {
                "patient": self.patient.id,
                "appointment_time": "2026-04-22T10:00",
                "end_time": "2026-04-22T10:40",
                "reason": "Follow up",
                "status": self.status.id,
                "appointment_type": self.appointment_type.id,
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 201)
        appointment = Appointment.objects.get(id=response.data["id"])
        self.assertEqual(response.data["end_time"], "2026-04-22T10:40")
        self.assertEqual(response.data["duration_minutes"], 40)
        self.assertEqual(appointment.duration_minutes, 40)

    def test_create_rejects_end_time_before_start_time(self):
        response = self.client.post(
            "/v1/appointments/",
            {
                "patient": self.patient.id,
                "appointment_time": "2026-04-22T10:00",
                "end_time": "2026-04-22T09:45",
                "reason": "Follow up",
                "status": self.status.id,
                "appointment_type": self.appointment_type.id,
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["end_time"][0],
            "Appointment end time must be after start time.",
        )

    def test_move_later_without_end_time_preserves_duration(self):
        # Drag-reschedule PUTs a new appointment_time with no end_time. Moving
        # to a slot later than the current end_time must succeed (regression:
        # it used to keep the stale end_time and 400 with "end after start"),
        # and the appointment's duration must be preserved.
        create = self.client.post(
            "/v1/appointments/",
            {
                "patient": self.patient.id,
                "appointment_time": "2026-04-22T09:00",
                "end_time": "2026-04-22T09:30",
                "reason": "Follow up",
                "status": self.status.id,
                "appointment_type": self.appointment_type.id,
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(create.status_code, 201)
        self.assertEqual(create.data["duration_minutes"], 30)
        appointment_id = create.data["id"]

        response = self.client.put(
            f"/v1/appointments/{appointment_id}/",
            {
                "patient": self.patient.id,
                "appointment_time": "2026-04-22T15:00",
                "reason": "Follow up",
                "status": self.status.id,
                "appointment_type": self.appointment_type.id,
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["appointment_time"], "2026-04-22T15:00")
        self.assertEqual(response.data["end_time"], "2026-04-22T15:30")
        self.assertEqual(response.data["duration_minutes"], 30)

    def test_create_accepts_rendering_provider_for_same_facility(self):
        response = self.client.post(
            "/v1/appointments/",
            {
                "patient": self.patient.id,
                "rendering_provider": self.rendering_provider.id,
                "appointment_time": "2026-04-22T10:30",
                "reason": "Follow up",
                "status": self.status.id,
                "appointment_type": self.appointment_type.id,
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 201)
        appointment = Appointment.objects.get(id=response.data["id"])
        self.assertEqual(appointment.rendering_provider_id, self.rendering_provider.id)
        self.assertEqual(response.data["rendering_provider_name"], "MD Riley Provider")

    def test_create_rejects_rendering_provider_from_other_facility(self):
        other_provider_user = User.objects.create_user(
            username="otherprovider",
            password="testpass123",
            email="otherprovider@example.com",
        )
        OrganizationMembership.objects.create(
            user=other_provider_user,
            organization=self.organization,
            role=OrganizationMembership.ROLE_MEMBER,
            is_active=True,
        )
        other_provider = Staff.objects.create(
            user=other_provider_user,
            facility=self.other_facility,
            role=StaffRole.objects.get(facility=self.other_facility, code="physician"),
            title=self.other_facility.titles.get(code="md"),
            is_active=True,
        )

        response = self.client.post(
            "/v1/appointments/",
            {
                "patient": self.patient.id,
                "rendering_provider": other_provider.id,
                "appointment_time": "2026-04-22T10:45",
                "reason": "Follow up",
                "status": self.status.id,
                "appointment_type": self.appointment_type.id,
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["rendering_provider"][0],
            "Rendering provider must belong to the same facility.",
        )

    def test_update_can_clear_rendering_provider(self):
        appointment = Appointment.objects.create(
            patient=self.patient,
            rendering_provider=self.rendering_provider,
            appointment_time=datetime(2026, 4, 22, 15, 0, tzinfo=ZoneInfo("UTC")),
            room="101",
            reason="Follow up",
            status=self.status,
            appointment_type=self.appointment_type,
            facility=self.facility,
            created_by=self.user,
        )

        response = self.client.patch(
            f"/v1/appointments/{appointment.pk}/",
            {"rendering_provider": None},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        appointment.refresh_from_db()
        self.assertIsNone(appointment.rendering_provider)
        self.assertEqual(appointment.rendering_provider_name, "")
        self.assertEqual(response.data["rendering_provider_name"], "")

    def test_signed_clinical_encounter_locks_clinical_appointment_fields(self):
        facility_tz = ZoneInfo(str(self.facility.timezone))
        appointment = self.create_appointment(
            local_time=datetime(2026, 4, 22, 9, 0, tzinfo=facility_tz),
        )
        encounter = Encounter.objects.create(
            patient=self.patient,
            facility=self.facility,
            appointment=appointment,
            rendering_provider=self.rendering_provider,
            reason="Follow up",
            created_by=self.user,
        )
        note = ProgressNote.objects.create(
            encounter=encounter,
            created_by=self.user,
            assessment="Stable.",
        )
        note.sign(self.user)

        response = self.client.patch(
            f"/v1/appointments/{appointment.pk}/",
            {"appointment_time": "2026-04-22T11:00"},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["clinical_encounter"][0],
            "Signed clinical encounters lock these appointment fields: Appointment time.",
        )

    def test_signed_clinical_encounter_allows_operational_appointment_updates(self):
        facility_tz = ZoneInfo(str(self.facility.timezone))
        appointment = self.create_appointment(
            local_time=datetime(2026, 4, 22, 9, 0, tzinfo=facility_tz),
        )
        encounter = Encounter.objects.create(
            patient=self.patient,
            facility=self.facility,
            appointment=appointment,
            rendering_provider=self.rendering_provider,
            reason="Follow up",
            created_by=self.user,
        )
        note = ProgressNote.objects.create(
            encounter=encounter,
            created_by=self.user,
            assessment="Stable.",
        )
        note.sign(self.user)

        response = self.client.patch(
            f"/v1/appointments/{appointment.pk}/",
            {"notes": "Patient requested a printed visit summary."},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        appointment.refresh_from_db()
        self.assertEqual(
            appointment.notes,
            "Patient requested a printed visit summary.",
        )

    def test_edit_session_acquires_current_user_lease(self):
        facility_tz = ZoneInfo(str(self.facility.timezone))
        appointment = self.create_appointment(
            local_time=datetime(2026, 4, 22, 9, 0, tzinfo=facility_tz),
        )

        response = self.client.post(
            f"/v1/appointments/{appointment.pk}/edit-session/",
            {"override": False},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "active")
        self.assertFalse(response.data["can_override"])
        session = AppointmentEditSession.objects.get(appointment=appointment)
        self.assertEqual(session.user, self.user)
        self.assertEqual(session.user_display_name, "Schedule User")

    def test_edit_session_warns_when_another_user_is_active(self):
        facility_tz = ZoneInfo(str(self.facility.timezone))
        appointment = self.create_appointment(
            local_time=datetime(2026, 4, 22, 9, 0, tzinfo=facility_tz),
        )
        AppointmentEditSession.objects.create(
            appointment=appointment,
            user=self.user,
            user_display_name="Schedule User",
        )
        second_user = self.create_scheduler_user()
        self.client.force_authenticate(second_user)

        response = self.client.post(
            f"/v1/appointments/{appointment.pk}/edit-session/",
            {"override": False},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "occupied")
        self.assertFalse(response.data["can_override"])
        self.assertEqual(response.data["active_editor"]["user_name"], "Schedule User")
        self.assertEqual(
            AppointmentEditSession.objects.get(appointment=appointment).user,
            self.user,
        )

    def test_edit_session_does_not_override_active_editor(self):
        facility_tz = ZoneInfo(str(self.facility.timezone))
        appointment = self.create_appointment(
            local_time=datetime(2026, 4, 22, 9, 0, tzinfo=facility_tz),
        )
        AppointmentEditSession.objects.create(
            appointment=appointment,
            user=self.user,
            user_display_name="Schedule User",
        )
        second_user = self.create_scheduler_user()
        self.client.force_authenticate(second_user)

        response = self.client.post(
            f"/v1/appointments/{appointment.pk}/edit-session/",
            {"override": True},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "occupied")
        self.assertFalse(response.data["can_override"])
        session = AppointmentEditSession.objects.get(appointment=appointment)
        self.assertEqual(session.user, self.user)
        self.assertEqual(session.user_display_name, "Schedule User")

    def test_edit_session_allows_takeover_after_stale_lease(self):
        facility_tz = ZoneInfo(str(self.facility.timezone))
        appointment = self.create_appointment(
            local_time=datetime(2026, 4, 22, 9, 0, tzinfo=facility_tz),
        )
        AppointmentEditSession.objects.create(
            appointment=appointment,
            user=self.user,
            user_display_name="Schedule User",
            last_seen_at=timezone.now() - timedelta(minutes=11),
        )
        second_user = self.create_scheduler_user()
        self.client.force_authenticate(second_user)

        response = self.client.post(
            f"/v1/appointments/{appointment.pk}/edit-session/",
            {"override": False},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "active")
        self.assertEqual(
            AppointmentEditSession.objects.get(appointment=appointment).user,
            second_user,
        )

    def test_edit_session_heartbeat_and_release_current_user_only(self):
        facility_tz = ZoneInfo(str(self.facility.timezone))
        appointment = self.create_appointment(
            local_time=datetime(2026, 4, 22, 9, 0, tzinfo=facility_tz),
        )
        second_user = self.create_scheduler_user()
        session = AppointmentEditSession.objects.create(
            appointment=appointment,
            user=self.user,
            user_display_name="Schedule User",
        )
        previous_seen_at = session.last_seen_at

        response = self.client.patch(
            f"/v1/appointments/{appointment.pk}/edit-session/",
            {},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "active")
        session.refresh_from_db()
        self.assertGreaterEqual(session.last_seen_at, previous_seen_at)

        self.client.force_authenticate(second_user)
        response = self.client.delete(
            f"/v1/appointments/{appointment.pk}/edit-session/",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            AppointmentEditSession.objects.filter(appointment=appointment).exists()
        )

        self.client.force_authenticate(self.user)
        response = self.client.delete(
            f"/v1/appointments/{appointment.pk}/edit-session/",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(
            AppointmentEditSession.objects.filter(appointment=appointment).exists()
        )

    def test_edit_session_reports_can_override_after_idle_threshold(self):
        facility_tz = ZoneInfo(str(self.facility.timezone))
        appointment = self.create_appointment(
            local_time=datetime(2026, 4, 22, 9, 0, tzinfo=facility_tz),
        )
        AppointmentEditSession.objects.create(
            appointment=appointment,
            user=self.user,
            user_display_name="Schedule User",
            last_seen_at=timezone.now() - timedelta(minutes=3),
        )
        second_user = self.create_scheduler_user()
        self.client.force_authenticate(second_user)

        response = self.client.post(
            f"/v1/appointments/{appointment.pk}/edit-session/",
            {"override": False},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        # Still occupied (no override flag), but now flagged as overridable.
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "occupied")
        self.assertTrue(response.data["can_override"])
        self.assertEqual(
            AppointmentEditSession.objects.get(appointment=appointment).user,
            self.user,
        )

    def test_edit_session_takeover_when_idle_and_override(self):
        facility_tz = ZoneInfo(str(self.facility.timezone))
        appointment = self.create_appointment(
            local_time=datetime(2026, 4, 22, 9, 0, tzinfo=facility_tz),
        )
        AppointmentEditSession.objects.create(
            appointment=appointment,
            user=self.user,
            user_display_name="Schedule User",
            last_seen_at=timezone.now() - timedelta(minutes=3),
        )
        second_user = self.create_scheduler_user()
        self.client.force_authenticate(second_user)

        response = self.client.post(
            f"/v1/appointments/{appointment.pk}/edit-session/",
            {"override": True},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "active")
        self.assertFalse(response.data["can_override"])
        session = AppointmentEditSession.objects.get(appointment=appointment)
        self.assertEqual(session.user, second_user)

    SLOT_START = "2026-04-22T09:00"

    def _slot_url(self, **overrides):
        # The slot key travels as query params; None values (e.g. a
        # resource-agnostic slot) are omitted.
        params = {"start_time": self.SLOT_START, "resource": self.resource.id}
        params.update(overrides)
        query = urlencode({k: v for k, v in params.items() if v is not None})
        return f"/v1/appointments/slot-hold/?{query}"

    def test_slot_hold_acquires_for_current_user(self):
        response = self.client.post(
            self._slot_url(),
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "active")
        self.assertFalse(response.data["can_override"])
        hold = AppointmentSlotHold.objects.get(resource=self.resource)
        self.assertEqual(hold.user, self.user)

    def test_slot_hold_warns_when_another_user_is_booking(self):
        AppointmentSlotHold.objects.create(
            facility=self.facility,
            resource=self.resource,
            start_time=timezone.now() + timedelta(days=1),
            user=self.user,
            user_display_name="Schedule User",
        )
        second_user = self.create_scheduler_user()
        self.client.force_authenticate(second_user)

        # Slot key must match the existing hold's; reuse the seeded start_time.
        hold = AppointmentSlotHold.objects.get(resource=self.resource)
        response = self.client.post(
            self._slot_url(start_time=hold.start_time.isoformat()),
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "occupied")
        # Slots are always overridable when another scheduler holds them.
        self.assertTrue(response.data["can_override"])
        self.assertEqual(response.data["active_user"]["user_name"], "Schedule User")
        self.assertEqual(
            AppointmentSlotHold.objects.get(resource=self.resource).user,
            self.user,
        )

    def test_slot_hold_override_takes_over(self):
        existing = AppointmentSlotHold.objects.create(
            facility=self.facility,
            resource=self.resource,
            start_time=timezone.now() + timedelta(days=1),
            user=self.user,
            user_display_name="Schedule User",
        )
        second_user = self.create_scheduler_user()
        self.client.force_authenticate(second_user)

        response = self.client.post(
            self._slot_url(start_time=existing.start_time.isoformat(), override="true"),
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "active")
        self.assertEqual(
            AppointmentSlotHold.objects.get(resource=self.resource).user,
            second_user,
        )

    def test_slot_hold_takes_over_stale_hold(self):
        existing = AppointmentSlotHold.objects.create(
            facility=self.facility,
            resource=self.resource,
            start_time=timezone.now() + timedelta(days=1),
            user=self.user,
            user_display_name="Schedule User",
            last_seen_at=timezone.now() - timedelta(minutes=6),
        )
        second_user = self.create_scheduler_user()
        self.client.force_authenticate(second_user)

        response = self.client.post(
            self._slot_url(start_time=existing.start_time.isoformat()),
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "active")
        self.assertEqual(
            AppointmentSlotHold.objects.get(resource=self.resource).user,
            second_user,
        )

    def test_slot_hold_release_current_user_only(self):
        existing = AppointmentSlotHold.objects.create(
            facility=self.facility,
            resource=self.resource,
            start_time=timezone.now() + timedelta(days=1),
            user=self.user,
            user_display_name="Schedule User",
        )
        url = self._slot_url(start_time=existing.start_time.isoformat())
        second_user = self.create_scheduler_user()
        self.client.force_authenticate(second_user)

        response = self.client.delete(url, HTTP_HOST="localhost:8000")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(AppointmentSlotHold.objects.filter(pk=existing.pk).exists())

        self.client.force_authenticate(self.user)
        response = self.client.delete(url, HTTP_HOST="localhost:8000")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(AppointmentSlotHold.objects.filter(pk=existing.pk).exists())

    def test_slot_hold_rejects_unknown_resource(self):
        response = self.client.post(
            self._slot_url(resource=999999),
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(response.status_code, 400)

    def test_slot_hold_rejects_non_numeric_resource(self):
        response = self.client.post(
            self._slot_url(resource="abc"),
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(response.status_code, 400)

    def test_slot_hold_get_not_allowed(self):
        # The slot-hold action only offers POST/PATCH/DELETE; GET is not
        # offered, so the API contract and catalog stay accurate.
        response = self.client.get(
            "/v1/appointments/slot-hold/",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(response.status_code, 405)

    def test_slot_hold_patch_does_not_acquire_for_non_holder(self):
        # A heartbeat with no existing hold is a no-op, not an acquire.
        response = self.client.patch(
            self._slot_url(),
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "available")
        self.assertFalse(AppointmentSlotHold.objects.exists())

    def test_slot_hold_null_resource_collides_under_unique_constraint(self):
        start = timezone.now() + timedelta(days=1)
        AppointmentSlotHold.objects.create(
            facility=self.facility,
            resource=None,
            start_time=start,
            user=self.user,
            user_display_name="Schedule User",
        )
        # Partial unique constraint covers the NULL-resource case so a duplicate
        # hold on the same (facility, start_time) cell still collides.
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                AppointmentSlotHold.objects.create(
                    facility=self.facility,
                    resource=None,
                    start_time=start,
                    user=self.create_scheduler_user(),
                    user_display_name="Second Scheduler",
                )

    def test_edit_session_patch_does_not_acquire_for_non_holder(self):
        facility_tz = ZoneInfo(str(self.facility.timezone))
        appointment = self.create_appointment(
            local_time=datetime(2026, 4, 22, 9, 0, tzinfo=facility_tz),
        )
        # A heartbeat with no existing session is a no-op, not an acquire.
        response = self.client.patch(
            f"/v1/appointments/{appointment.pk}/edit-session/",
            {},
            format="json",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "available")
        self.assertFalse(
            AppointmentEditSession.objects.filter(appointment=appointment).exists()
        )

    def test_history_returns_created_and_updated_entries(self):
        appointment = Appointment.objects.create(
            patient=self.patient,
            rendering_provider=self.rendering_provider,
            appointment_time=datetime(2026, 4, 22, 16, 0, tzinfo=ZoneInfo("UTC")),
            room="101",
            reason="Follow up",
            status=self.status,
            appointment_type=self.appointment_type,
            facility=self.facility,
            created_by=self.user,
            created_by_name="Schedule User",
        )

        AuditEvent.objects.create(
            actor=self.user,
            facility=self.facility,
            patient=self.patient,
            action="update",
            app_label="appointments",
            model_name="appointment",
            object_pk=str(appointment.pk),
            summary="Updated appointment details",
            metadata={
                "actor_name": "Schedule User",
                "changed_fields": ["Status", "Appointment time"],
            },
        )

        response = self.client.get(
            f"/v1/appointments/{appointment.pk}/history/",
            {"facility_id": self.facility.id},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]["action"], "update")
        self.assertEqual(
            response.data[0]["changed_fields"], ["Status", "Appointment time"]
        )
        self.assertTrue(any(item["action"] == "create" for item in response.data))
