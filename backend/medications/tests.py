from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from audit.models import AuditEvent
from facilities.models import Facility, Staff, StaffRole
from organizations.models import Organization, OrganizationMembership
from patients.models import Patient

from .models import Medication

User = get_user_model()


class MedicationViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.organization = Organization.objects.create(
            name="CareFlow Health",
            slug="careflow-health",
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Main Clinic",
            timezone="America/New_York",
        )
        self.other_facility = Facility.objects.create(
            organization=self.organization,
            name="North Clinic",
            timezone="America/New_York",
        )
        self.user = User.objects.create_user(
            username="clinician",
            password="testpass123",
            email="clinician@example.com",
        )
        OrganizationMembership.objects.create(
            user=self.user,
            organization=self.organization,
            role=OrganizationMembership.ROLE_MEMBER,
            is_active=True,
        )
        Staff.objects.create(
            user=self.user,
            facility=self.facility,
            role=StaffRole.objects.get(facility=self.facility, code="nurse"),
            is_active=True,
            is_default=True,
        )
        self.patient = Patient.objects.create(
            facility=self.facility,
            first_name="Mia",
            last_name="Martinez",
            date_of_birth=date(1990, 4, 1),
            gender=self.facility.patient_genders.first(),
        )
        self.other_patient = Patient.objects.create(
            facility=self.other_facility,
            first_name="Noah",
            last_name="Rivera",
            date_of_birth=date(1992, 6, 2),
            gender=self.other_facility.patient_genders.first(),
        )
        self.client.force_authenticate(self.user)

    def build_payload(self, **overrides):
        payload = {
            "patient": self.patient.id,
            "status": "active",
            "medication_name": "Lisinopril",
            "dose": "10 mg",
            "route": "PO",
            "frequency": "Daily",
            "start_date": "2026-05-01",
            "end_date": None,
            "prescriber_name": "Dr. Chen",
            "notes": "Take in the morning.",
        }
        payload.update(overrides)
        return payload

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
        Staff.objects.create(
            user=user,
            facility=facility,
            role=StaffRole.objects.get(facility=facility, code=role_code),
            is_active=True,
        )
        return user

    def test_unauthenticated_access_is_rejected(self):
        client = APIClient()
        response = client.get(
            "/v1/medications/",
            {"facility_id": self.facility.id, "patient_id": self.patient.id},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 401)

    def test_list_requires_facility_staff_membership(self):
        response = self.client.get(
            "/v1/medications/",
            {"facility_id": self.other_facility.id},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.data["detail"],
            "You do not have access to this facility.",
        )

    def test_create_list_update_and_discontinue_medication(self):
        create_response = self.client.post(
            f"/v1/medications/?facility_id={self.facility.id}",
            self.build_payload(),
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(create_response.data["facility"], self.facility.id)
        self.assertEqual(create_response.data["patient"], self.patient.id)
        medication = Medication.objects.get(pk=create_response.data["id"])
        self.assertEqual(medication.facility_id, self.facility.id)
        self.assertEqual(medication.created_by, self.user)
        self.assertTrue(
            AuditEvent.objects.filter(
                actor=self.user,
                patient=self.patient,
                action="create",
                app_label="medications",
                model_name="medication",
            ).exists()
        )

        list_response = self.client.get(
            "/v1/medications/",
            {"facility_id": self.facility.id, "patient_id": self.patient.id},
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual([item["id"] for item in list_response.data], [medication.id])

        patch_response = self.client.patch(
            f"/v1/medications/{medication.id}/?facility_id={self.facility.id}",
            {"frequency": "Twice daily", "notes": "Monitor blood pressure."},
            format="json",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(patch_response.status_code, 200)
        self.assertEqual(patch_response.data["frequency"], "Twice daily")

        delete_response = self.client.delete(
            f"/v1/medications/{medication.id}/?facility_id={self.facility.id}",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(delete_response.status_code, 204)
        medication.refresh_from_db()
        self.assertEqual(medication.status, Medication.STATUS_DISCONTINUED)
        self.assertIsNotNone(medication.end_date)
        self.assertTrue(
            AuditEvent.objects.filter(
                actor=self.user,
                patient=self.patient,
                action="delete",
                app_label="medications",
                model_name="medication",
            ).exists()
        )

    def test_create_rejects_cross_facility_patient(self):
        response = self.client.post(
            f"/v1/medications/?facility_id={self.facility.id}",
            self.build_payload(patient=self.other_patient.id),
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["patient"][0],
            "Selected patient does not belong to this facility.",
        )

    def test_detail_rejects_cross_facility_medication(self):
        medication = Medication.objects.create(
            facility=self.other_facility,
            patient=self.other_patient,
            medication_name="Metformin",
            dose="500 mg",
            route="PO",
            frequency="Daily",
        )

        response = self.client.get(
            f"/v1/medications/{medication.id}/",
            {"facility_id": self.facility.id},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.data["detail"],
            "You do not have access to this medication.",
        )

    def test_medication_manage_permission_is_required_for_mutations(self):
        medication = Medication.objects.create(
            facility=self.facility,
            patient=self.patient,
            medication_name="Atorvastatin",
            dose="20 mg",
            route="PO",
            frequency="Nightly",
        )
        view_only_user = self.create_staff_user("front-desk", self.facility)
        self.client.force_authenticate(view_only_user)

        list_response = self.client.get(
            "/v1/medications/",
            {"facility_id": self.facility.id, "patient_id": self.patient.id},
            HTTP_HOST="localhost:8000",
        )
        create_response = self.client.post(
            f"/v1/medications/?facility_id={self.facility.id}",
            self.build_payload(medication_name="Amlodipine"),
            format="json",
            HTTP_HOST="localhost:8000",
        )
        update_response = self.client.patch(
            f"/v1/medications/{medication.id}/?facility_id={self.facility.id}",
            {"frequency": "Changed without permission."},
            format="json",
            HTTP_HOST="localhost:8000",
        )
        delete_response = self.client.delete(
            f"/v1/medications/{medication.id}/?facility_id={self.facility.id}",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(create_response.status_code, 403)
        self.assertEqual(update_response.status_code, 403)
        self.assertEqual(delete_response.status_code, 403)
        self.assertEqual(
            create_response.data["detail"],
            "You do not have access to manage medications.",
        )

    def test_list_rejects_invalid_filters_and_cross_facility_patient(self):
        invalid_response = self.client.get(
            "/v1/medications/",
            {"facility_id": self.facility.id, "patient_id": "abc"},
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(invalid_response.status_code, 400)
        self.assertEqual(invalid_response.data["patient_id"][0], "Use a numeric id.")

        status_response = self.client.get(
            "/v1/medications/",
            {"facility_id": self.facility.id, "status": "pending"},
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(status_response.status_code, 400)
        self.assertEqual(
            status_response.data["status"][0],
            "Unsupported medication status.",
        )

        cross_facility_response = self.client.get(
            "/v1/medications/",
            {"facility_id": self.facility.id, "patient_id": self.other_patient.id},
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(cross_facility_response.status_code, 403)
        self.assertEqual(
            cross_facility_response.data["detail"],
            "You do not have access to this patient.",
        )

    def test_validation_rejects_unknown_fields_and_bad_dates(self):
        unknown_response = self.client.post(
            f"/v1/medications/?facility_id={self.facility.id}",
            self.build_payload(unexpected="ignored before hardening"),
            format="json",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(unknown_response.status_code, 400)
        self.assertEqual(unknown_response.data["unexpected"][0], "Unknown field.")

        date_response = self.client.post(
            f"/v1/medications/?facility_id={self.facility.id}",
            self.build_payload(start_date="2026-05-10", end_date="2026-05-01"),
            format="json",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(date_response.status_code, 400)
        self.assertEqual(
            date_response.data["end_date"][0],
            "End date cannot be before start date.",
        )
