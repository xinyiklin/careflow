from datetime import date, datetime
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from appointments.models import Appointment
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


class ClinicalEncounterViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.organization = Organization.objects.create(
            name="CareFlow Health",
            slug="careflow-health",
        )
        self.user = User.objects.create_user(
            username="clinician",
            password="testpass123",
            email="clinician@example.com",
            first_name="Care",
            last_name="Clinician",
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
        self.staff = Staff.objects.create(
            user=self.user,
            facility=self.facility,
            role=StaffRole.objects.get(facility=self.facility, code="admin"),
            title=self.facility.titles.get(code="md"),
            is_active=True,
            is_default=True,
        )

        self.gender = self.facility.patient_genders.first()
        self.patient = Patient.objects.create(
            facility=self.facility,
            first_name="Mia",
            last_name="Martinez",
            date_of_birth=date(1990, 4, 1),
            gender=self.gender,
        )
        self.status = AppointmentStatus.objects.get(
            facility=self.facility,
            code="pending",
        )
        self.appointment_type = AppointmentType.objects.get(
            facility=self.facility,
            code="follow_up",
        )
        facility_tz = ZoneInfo(str(self.facility.timezone))
        self.appointment = Appointment.objects.create(
            patient=self.patient,
            rendering_provider=self.staff,
            appointment_time=datetime(2026, 4, 22, 9, 0, tzinfo=facility_tz),
            room="101",
            reason="Follow up",
            status=self.status,
            appointment_type=self.appointment_type,
            facility=self.facility,
            created_by=self.user,
        )

        self.client.force_authenticate(self.user)

    def create_encounter(self):
        encounter = Encounter.objects.create(
            patient=self.patient,
            facility=self.facility,
            appointment=self.appointment,
            rendering_provider=self.staff,
            reason="Follow up",
            created_by=self.user,
        )
        ProgressNote.objects.create(
            encounter=encounter,
            created_by=self.user,
            subjective="Doing well.",
            objective="Vitals reviewed.",
            assessment="Stable.",
            plan="Continue plan.",
        )
        return encounter

    def test_unauthenticated_access_is_rejected(self):
        client = APIClient()
        response = client.get(
            "/v1/clinical/encounters/",
            {"facility_id": self.facility.id, "patient_id": self.patient.id},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 401)

    def test_list_rejects_explicit_facility_without_staff_membership(self):
        response = self.client.get(
            "/v1/clinical/encounters/",
            {"facility_id": self.other_facility.id},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.data["detail"],
            "You do not have access to this facility.",
        )

    def test_create_encounter_with_progress_note_records_audit_event(self):
        response = self.client.post(
            f"/v1/clinical/encounters/?facility_id={self.facility.id}",
            {
                "patient": self.patient.id,
                "appointment": self.appointment.id,
                "rendering_provider": self.staff.id,
                "reason": "Follow up",
                "progress_note": {
                    "subjective": "Feeling better.",
                    "objective": "No acute distress.",
                    "assessment": "Improving.",
                    "plan": "Return in one month.",
                },
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["patient"], self.patient.id)
        self.assertEqual(response.data["appointment"], self.appointment.id)
        self.assertEqual(response.data["progress_note"]["status"], "draft")

        encounter = Encounter.objects.get(pk=response.data["id"])
        self.assertEqual(encounter.facility_id, self.facility.id)
        self.assertEqual(encounter.progress_note.assessment, "Improving.")
        self.assertTrue(
            AuditEvent.objects.filter(
                app_label="clinical",
                model_name="encounter",
                object_pk=str(encounter.pk),
                action="create",
            ).exists()
        )

    def test_list_filters_by_patient(self):
        encounter = self.create_encounter()

        response = self.client.get(
            "/v1/clinical/encounters/",
            {"facility_id": self.facility.id, "patient_id": self.patient.id},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data], [encounter.id])
        self.assertEqual(response.data[0]["progress_note"]["status"], "draft")

    def test_create_rejects_cross_facility_appointment(self):
        Staff.objects.create(
            user=self.user,
            facility=self.other_facility,
            role=StaffRole.objects.get(facility=self.other_facility, code="admin"),
            is_active=True,
        )
        other_patient = Patient.objects.create(
            facility=self.other_facility,
            first_name="Noah",
            last_name="North",
            date_of_birth=date(1988, 2, 2),
            gender=self.other_facility.patient_genders.first(),
        )
        other_appointment = Appointment.objects.create(
            patient=other_patient,
            appointment_time=datetime(
                2026,
                4,
                22,
                9,
                0,
                tzinfo=ZoneInfo(str(self.other_facility.timezone)),
            ),
            room="201",
            reason="Consult",
            status=AppointmentStatus.objects.get(
                facility=self.other_facility,
                code="pending",
            ),
            appointment_type=AppointmentType.objects.get(
                facility=self.other_facility,
                code="consult",
            ),
            facility=self.other_facility,
            created_by=self.user,
        )

        response = self.client.post(
            f"/v1/clinical/encounters/?facility_id={self.facility.id}",
            {
                "patient": self.patient.id,
                "appointment": other_appointment.id,
                "reason": "Wrong appointment",
                "progress_note": {"assessment": "Invalid"},
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["appointment"][0],
            "Selected appointment does not belong to this facility.",
        )

    def test_signing_note_locks_future_note_edits(self):
        encounter = self.create_encounter()
        note = encounter.progress_note

        sign_response = self.client.post(
            f"/v1/clinical/progress-notes/{note.id}/sign/?facility_id={self.facility.id}",
            {},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(sign_response.status_code, 200)
        note.refresh_from_db()
        encounter.refresh_from_db()
        self.assertEqual(note.status, "signed")
        self.assertEqual(note.signed_by_id, self.user.id)
        self.assertEqual(encounter.status, "signed")

        patch_response = self.client.patch(
            f"/v1/clinical/progress-notes/{note.id}/?facility_id={self.facility.id}",
            {"assessment": "Changed after signing."},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(patch_response.status_code, 400)
        self.assertEqual(
            patch_response.data["status"][0],
            "Signed progress notes cannot be edited.",
        )
