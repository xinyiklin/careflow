from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from allergies.models import PatientAllergy
from audit.models import AuditEvent
from facilities.models import Facility, Staff, StaffRole
from organizations.models import Organization, OrganizationMembership
from patients.models import Patient

User = get_user_model()


class PatientAllergyViewSetTests(TestCase):
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
            last_name="North",
            date_of_birth=date(1988, 2, 2),
            gender=self.other_facility.patient_genders.first(),
        )
        self.client.force_authenticate(self.user)

    def create_allergy(self, **overrides):
        values = {
            "patient": self.patient,
            "facility": self.facility,
            "allergen": "Penicillin",
            "category": PatientAllergy.CATEGORY_MEDICATION,
            "reaction": "Rash",
            "severity": PatientAllergy.SEVERITY_MODERATE,
            "status": PatientAllergy.STATUS_ACTIVE,
            "created_by": self.user,
            "updated_by": self.user,
        }
        values.update(overrides)
        return PatientAllergy.objects.create(**values)

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
            "/v1/allergies/patient-allergies/",
            {"facility_id": self.facility.id, "patient_id": self.patient.id},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 401)

    def test_list_filters_by_patient_and_active_flag(self):
        active_allergy = self.create_allergy()
        self.create_allergy(
            allergen="Shellfish",
            category=PatientAllergy.CATEGORY_FOOD,
            status=PatientAllergy.STATUS_RESOLVED,
        )

        response = self.client.get(
            "/v1/allergies/patient-allergies/",
            {
                "facility_id": self.facility.id,
                "patient_id": self.patient.id,
                "is_active": "true",
            },
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data], [active_allergy.id])
        self.assertEqual(response.data[0]["patient"], self.patient.id)
        self.assertEqual(response.data[0]["category_label"], "Medication")
        self.assertTrue(response.data[0]["is_active"])

    def test_create_allergy_records_audit_event(self):
        response = self.client.post(
            f"/v1/allergies/patient-allergies/?facility_id={self.facility.id}",
            {
                "patient": self.patient.id,
                "allergen": "Amoxicillin",
                "category": "medication",
                "reaction": "Hives",
                "severity": "severe",
                "onset_date": "2026-04-01",
                "status": "active",
                "notes": "Reported by patient.",
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["allergen"], "Amoxicillin")
        self.assertEqual(response.data["facility"], self.facility.id)
        self.assertTrue(response.data["is_active"])

        allergy = PatientAllergy.objects.get(pk=response.data["id"])
        self.assertEqual(allergy.facility_id, self.facility.id)
        self.assertTrue(
            AuditEvent.objects.filter(
                app_label="allergies",
                model_name="patientallergy",
                object_pk=str(allergy.pk),
                action="create",
            ).exists()
        )

    def test_update_resolved_allergy_sets_inactive_and_records_audit(self):
        allergy = self.create_allergy()

        response = self.client.patch(
            f"/v1/allergies/patient-allergies/{allergy.id}/?facility_id={self.facility.id}",
            {
                "reaction": "Rash and swelling",
                "status": "resolved",
                "notes": "Historical reaction only.",
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["is_active"])
        allergy.refresh_from_db()
        self.assertEqual(allergy.status, PatientAllergy.STATUS_RESOLVED)
        self.assertFalse(allergy.is_active)
        self.assertTrue(
            AuditEvent.objects.filter(
                app_label="allergies",
                model_name="patientallergy",
                object_pk=str(allergy.pk),
                action="update",
            ).exists()
        )

    def test_delete_marks_allergy_entered_in_error_and_records_audit(self):
        allergy = self.create_allergy()

        response = self.client.delete(
            f"/v1/allergies/patient-allergies/{allergy.id}/",
            {"facility_id": self.facility.id},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 204)
        allergy.refresh_from_db()
        self.assertEqual(allergy.status, PatientAllergy.STATUS_ENTERED_IN_ERROR)
        self.assertFalse(allergy.is_active)
        self.assertEqual(allergy.updated_by, self.user)
        self.assertTrue(
            AuditEvent.objects.filter(
                app_label="allergies",
                model_name="patientallergy",
                object_pk=str(allergy.pk),
                action="delete",
            ).exists()
        )

    def test_rejects_unknown_read_only_future_and_duplicate_payload_fields(self):
        self.create_allergy(allergen="Penicillin")
        future_date = date.today() + timedelta(days=1)

        unknown_response = self.client.post(
            f"/v1/allergies/patient-allergies/?facility_id={self.facility.id}",
            {
                "patient": self.patient.id,
                "allergen": "Aspirin",
                "reaction": "Wheezing",
                "unexpected": "ignored before hardening",
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )
        read_only_response = self.client.post(
            f"/v1/allergies/patient-allergies/?facility_id={self.facility.id}",
            {
                "patient": self.patient.id,
                "facility": self.facility.id,
                "allergen": "Aspirin",
                "reaction": "Wheezing",
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )
        future_response = self.client.post(
            f"/v1/allergies/patient-allergies/?facility_id={self.facility.id}",
            {
                "patient": self.patient.id,
                "allergen": "Aspirin",
                "reaction": "Wheezing",
                "onset_date": future_date.isoformat(),
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )
        duplicate_response = self.client.post(
            f"/v1/allergies/patient-allergies/?facility_id={self.facility.id}",
            {
                "patient": self.patient.id,
                "allergen": "penicillin",
                "category": "medication",
                "reaction": "Hives",
                "status": "active",
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(unknown_response.status_code, 400)
        self.assertEqual(unknown_response.data["unexpected"][0], "Unknown field.")
        self.assertEqual(read_only_response.status_code, 400)
        self.assertEqual(
            read_only_response.data["facility"][0],
            "This field is read-only.",
        )
        self.assertEqual(future_response.status_code, 400)
        self.assertEqual(
            future_response.data["onset_date"][0],
            "Onset date cannot be in the future.",
        )
        self.assertEqual(duplicate_response.status_code, 400)
        self.assertEqual(
            duplicate_response.data["allergen"][0],
            "An active allergy already exists for this patient and allergen.",
        )

    def test_cross_facility_access_is_rejected(self):
        other_allergy = PatientAllergy.objects.create(
            patient=self.other_patient,
            facility=self.other_facility,
            allergen="Peanuts",
            category=PatientAllergy.CATEGORY_FOOD,
            reaction="Anaphylaxis",
            severity=PatientAllergy.SEVERITY_LIFE_THREATENING,
        )

        list_response = self.client.get(
            "/v1/allergies/patient-allergies/",
            {"facility_id": self.facility.id, "patient_id": self.other_patient.id},
            HTTP_HOST="localhost:8000",
        )
        detail_response = self.client.get(
            f"/v1/allergies/patient-allergies/{other_allergy.id}/",
            {"facility_id": self.facility.id},
            HTTP_HOST="localhost:8000",
        )
        explicit_facility_response = self.client.get(
            "/v1/allergies/patient-allergies/",
            {"facility_id": self.other_facility.id},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(list_response.status_code, 403)
        self.assertEqual(detail_response.status_code, 403)
        self.assertEqual(explicit_facility_response.status_code, 403)
        self.assertEqual(
            detail_response.data["detail"],
            "You do not have access to this allergy record.",
        )

    def test_allergy_manage_permission_is_required_for_mutations(self):
        allergy = self.create_allergy()
        view_only_user, _ = self.create_staff_user("front-desk", self.facility)
        self.client.force_authenticate(view_only_user)

        list_response = self.client.get(
            "/v1/allergies/patient-allergies/",
            {"facility_id": self.facility.id, "patient_id": self.patient.id},
            HTTP_HOST="localhost:8000",
        )
        create_response = self.client.post(
            f"/v1/allergies/patient-allergies/?facility_id={self.facility.id}",
            {
                "patient": self.patient.id,
                "allergen": "Latex",
                "reaction": "Rash",
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )
        update_response = self.client.patch(
            f"/v1/allergies/patient-allergies/{allergy.id}/?facility_id={self.facility.id}",
            {"reaction": "Changed without permission."},
            format="json",
            HTTP_HOST="localhost:8000",
        )
        delete_response = self.client.delete(
            f"/v1/allergies/patient-allergies/{allergy.id}/",
            {"facility_id": self.facility.id},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(create_response.status_code, 403)
        self.assertEqual(update_response.status_code, 403)
        self.assertEqual(delete_response.status_code, 403)
