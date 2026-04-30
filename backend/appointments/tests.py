from datetime import date, datetime
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from appointments.models import Appointment
from audit.models import AuditEvent
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
