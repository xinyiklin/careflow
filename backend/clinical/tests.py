from datetime import date, datetime
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
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

    def create_staff_user(self, username, facility, role_code="staff"):
        user = User.objects.create_user(
            username=username,
            password="testpass123",
            email=f"{username}@example.com",
        )
        OrganizationMembership.objects.create(
            user=user,
            organization=self.organization,
            role=OrganizationMembership.ROLE_MEMBER,
            is_active=True,
        )
        staff = Staff.objects.create(
            user=user,
            facility=facility,
            role=StaffRole.objects.get(facility=facility, code=role_code),
            title=facility.titles.get(code="md"),
            is_active=True,
        )
        return user, staff

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
        self.assertTrue(
            AuditEvent.objects.filter(
                app_label="clinical",
                model_name="progressnote",
                object_pk=str(encounter.progress_note.pk),
                action="create",
            ).exists()
        )

    def test_create_rejects_unknown_encounter_and_nested_note_fields(self):
        response = self.client.post(
            f"/v1/clinical/encounters/?facility_id={self.facility.id}",
            {
                "patient": self.patient.id,
                "appointment": self.appointment.id,
                "reason": "Follow up",
                "unexpected": "ignored before hardening",
                "progress_note": {"assessment": "Stable."},
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["unexpected"][0], "Unknown field.")

        response = self.client.post(
            f"/v1/clinical/encounters/?facility_id={self.facility.id}",
            {
                "patient": self.patient.id,
                "appointment": self.appointment.id,
                "reason": "Follow up",
                "progress_note": {
                    "assessment": "Stable.",
                    "extra_note_field": "ignored before hardening",
                },
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["progress_note"]["extra_note_field"][0],
            "Unknown field.",
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

    def test_list_rejects_invalid_filter_values(self):
        patient_response = self.client.get(
            "/v1/clinical/encounters/",
            {"facility_id": self.facility.id, "patient_id": "abc"},
            HTTP_HOST="localhost:8000",
        )
        status_response = self.client.get(
            "/v1/clinical/encounters/",
            {"facility_id": self.facility.id, "status": "archived"},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(patient_response.status_code, 400)
        self.assertEqual(patient_response.data["patient_id"][0], "Use a numeric id.")
        self.assertEqual(status_response.status_code, 400)
        self.assertEqual(
            status_response.data["status"][0],
            "Unsupported encounter status.",
        )

    def test_detail_rejects_cross_facility_encounter(self):
        other_patient = Patient.objects.create(
            facility=self.other_facility,
            first_name="Noah",
            last_name="North",
            date_of_birth=date(1988, 2, 2),
            gender=self.other_facility.patient_genders.first(),
        )
        other_encounter = Encounter.objects.create(
            patient=other_patient,
            facility=self.other_facility,
            reason="Other facility",
            created_by=self.user,
        )
        ProgressNote.objects.create(encounter=other_encounter, created_by=self.user)

        response = self.client.get(
            f"/v1/clinical/encounters/{other_encounter.id}/",
            {"facility_id": self.facility.id},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.data["detail"],
            "You do not have access to this encounter.",
        )

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

    def test_create_rejects_duplicate_active_encounter_for_appointment(self):
        self.create_encounter()

        response = self.client.post(
            f"/v1/clinical/encounters/?facility_id={self.facility.id}",
            {
                "patient": self.patient.id,
                "appointment": self.appointment.id,
                "reason": "Duplicate",
                "progress_note": {"assessment": "Duplicate"},
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["appointment"][0],
            "Appointment already has an active encounter.",
        )

    def test_create_requires_provider_to_match_appointment_provider(self):
        _, other_staff = self.create_staff_user(
            "other-provider",
            self.facility,
            "physician",
        )

        response = self.client.post(
            f"/v1/clinical/encounters/?facility_id={self.facility.id}",
            {
                "patient": self.patient.id,
                "appointment": self.appointment.id,
                "rendering_provider": other_staff.id,
                "reason": "Provider mismatch",
                "progress_note": {"assessment": "Mismatch"},
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["rendering_provider"][0],
            "Rendering provider must match the appointment provider.",
        )

    def test_encounter_update_rejects_nested_progress_note_payload(self):
        encounter = self.create_encounter()

        response = self.client.patch(
            f"/v1/clinical/encounters/{encounter.id}/?facility_id={self.facility.id}",
            {
                "reason": "Updated reason",
                "progress_note": {"assessment": "Nested update"},
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["progress_note"][0],
            "Update progress notes through the progress note endpoint.",
        )
        encounter.refresh_from_db()
        self.assertEqual(encounter.reason, "Follow up")
        self.assertEqual(encounter.progress_note.assessment, "Stable.")

    def test_clinical_permissions_are_required_for_mutations(self):
        view_only_user, _ = self.create_staff_user("front-desk", self.facility)
        encounter = self.create_encounter()
        note = encounter.progress_note
        self.client.force_authenticate(view_only_user)

        create_response = self.client.post(
            f"/v1/clinical/encounters/?facility_id={self.facility.id}",
            {
                "patient": self.patient.id,
                "reason": "No create permission",
                "progress_note": {"assessment": "Denied"},
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )
        update_response = self.client.patch(
            f"/v1/clinical/progress-notes/{note.id}/?facility_id={self.facility.id}",
            {"assessment": "Changed without permission."},
            format="json",
            HTTP_HOST="localhost:8000",
        )
        sign_response = self.client.post(
            f"/v1/clinical/progress-notes/{note.id}/sign/?facility_id={self.facility.id}",
            {},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(create_response.status_code, 403)
        self.assertEqual(update_response.status_code, 403)
        self.assertEqual(sign_response.status_code, 403)

    def test_rendering_provider_can_sign_without_sign_permission(self):
        provider_user, provider_staff = self.create_staff_user(
            "provider-nurse", self.facility, "nurse"
        )
        facility_tz = ZoneInfo(str(self.facility.timezone))
        appointment = Appointment.objects.create(
            patient=self.patient,
            rendering_provider=provider_staff,
            appointment_time=datetime(2026, 6, 1, 10, 0, tzinfo=facility_tz),
            room="102",
            reason="Checkup",
            status=self.status,
            appointment_type=self.appointment_type,
            facility=self.facility,
            created_by=self.user,
        )
        encounter = Encounter.objects.create(
            patient=self.patient,
            facility=self.facility,
            appointment=appointment,
            rendering_provider=provider_staff,
            reason="Checkup",
            created_by=self.user,
        )
        ProgressNote.objects.create(
            encounter=encounter,
            created_by=self.user,
            subjective="Reports fatigue.",
        )
        note = encounter.progress_note

        self.client.force_authenticate(provider_user)

        response = self.client.post(
            f"/v1/clinical/progress-notes/{note.id}/sign/?facility_id={self.facility.id}",
            {},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "signed")

    def test_sign_rejects_non_provider_without_sign_permission(self):
        other_user, _ = self.create_staff_user("front-desk2", self.facility)
        encounter = self.create_encounter()
        note = encounter.progress_note

        self.client.force_authenticate(other_user)

        response = self.client.post(
            f"/v1/clinical/progress-notes/{note.id}/sign/?facility_id={self.facility.id}",
            {},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("rendering provider", response.data["detail"])

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

        note.assessment = "Model-level edit after signing."
        with self.assertRaises(DjangoValidationError):
            note.save()

    def test_signing_note_locks_future_encounter_edits(self):
        encounter = self.create_encounter()
        note = encounter.progress_note

        self.client.post(
            f"/v1/clinical/progress-notes/{note.id}/sign/?facility_id={self.facility.id}",
            {},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        response = self.client.patch(
            f"/v1/clinical/encounters/{encounter.id}/?facility_id={self.facility.id}",
            {"reason": "Changed after signing."},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["status"][0],
            "Signed encounters cannot be edited.",
        )

        encounter.refresh_from_db()
        encounter.reason = "Model-level encounter edit after signing."
        with self.assertRaises(DjangoValidationError):
            encounter.save()

    def test_sign_rejects_unknown_action_payload_fields(self):
        encounter = self.create_encounter()
        note = encounter.progress_note

        response = self.client.post(
            f"/v1/clinical/progress-notes/{note.id}/sign/?facility_id={self.facility.id}",
            {"signed_by": self.user.id},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["signed_by"][0], "Unknown field.")

    def test_unsign_reverts_note_and_encounter_to_draft(self):
        encounter = self.create_encounter()
        note = encounter.progress_note

        self.client.post(
            f"/v1/clinical/progress-notes/{note.id}/sign/?facility_id={self.facility.id}",
            {},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        response = self.client.post(
            f"/v1/clinical/progress-notes/{note.id}/unsign/?facility_id={self.facility.id}",
            {},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "draft")
        self.assertIsNone(response.data["signed_by"])
        self.assertEqual(response.data["signed_by_name"], "")
        self.assertIsNone(response.data["signed_at"])

        note.refresh_from_db()
        encounter.refresh_from_db()
        self.assertEqual(note.status, "draft")
        self.assertIsNone(note.signed_by)
        self.assertEqual(encounter.status, "in_progress")

    def test_unsign_allows_future_edits(self):
        encounter = self.create_encounter()
        note = encounter.progress_note

        self.client.post(
            f"/v1/clinical/progress-notes/{note.id}/sign/?facility_id={self.facility.id}",
            {},
            format="json",
            HTTP_HOST="localhost:8000",
        )
        self.client.post(
            f"/v1/clinical/progress-notes/{note.id}/unsign/?facility_id={self.facility.id}",
            {},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        response = self.client.patch(
            f"/v1/clinical/progress-notes/{note.id}/?facility_id={self.facility.id}",
            {"assessment": "Updated after unsign."},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        note.refresh_from_db()
        self.assertEqual(note.assessment, "Updated after unsign.")

    def test_unsign_records_audit_event_with_original_signer(self):
        encounter = self.create_encounter()
        note = encounter.progress_note

        self.client.post(
            f"/v1/clinical/progress-notes/{note.id}/sign/?facility_id={self.facility.id}",
            {},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.client.post(
            f"/v1/clinical/progress-notes/{note.id}/unsign/?facility_id={self.facility.id}",
            {},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        event = AuditEvent.objects.filter(
            app_label="clinical",
            model_name="progressnote",
            object_pk=str(note.pk),
            summary="Unsigned progress note",
        ).first()

        self.assertIsNotNone(event)
        self.assertEqual(event.metadata["original_signer"], "Care Clinician")
        self.assertTrue(event.metadata["is_rendering_provider"])

    def test_unsign_rejects_user_without_permission_or_attending_role(self):
        encounter = self.create_encounter()
        note = encounter.progress_note

        self.client.post(
            f"/v1/clinical/progress-notes/{note.id}/sign/?facility_id={self.facility.id}",
            {},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        other_user, _ = self.create_staff_user("other-clinician", self.facility)
        self.client.force_authenticate(other_user)

        response = self.client.post(
            f"/v1/clinical/progress-notes/{note.id}/unsign/?facility_id={self.facility.id}",
            {},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("rendering provider", response.data["detail"])

    def test_unsign_is_idempotent_for_draft_note(self):
        encounter = self.create_encounter()
        note = encounter.progress_note

        response = self.client.post(
            f"/v1/clinical/progress-notes/{note.id}/unsign/?facility_id={self.facility.id}",
            {},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "draft")
