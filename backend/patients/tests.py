from datetime import date

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.test import APIClient

from audit.models import AuditEvent
from facilities.models import Facility, Staff, StaffRole
from organizations.models import Organization, OrganizationMembership
from patients.models import (
    Patient,
    PatientDocument,
    PatientDocumentCategory,
    PatientEmergencyContact,
    PatientPhone,
)

User = get_user_model()


class PatientViewSetTests(TestCase):
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
        self.user = User.objects.create_user(
            username="frontdesk",
            password="testpass123",
            email="frontdesk@example.com",
        )
        OrganizationMembership.objects.create(
            user=self.user,
            organization=self.organization,
            role=OrganizationMembership.ROLE_ADMIN,
            is_active=True,
        )
        self.staff = Staff.objects.create(
            user=self.user,
            facility=self.facility,
            role=StaffRole.objects.get(facility=self.facility, code="admin"),
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
            chart_number="100",
            email="mia@example.com",
            ssn="123456789",
        )
        PatientPhone.objects.create(
            patient=self.patient,
            number="555-123-4488",
            label="cell",
            is_primary=True,
        )

        self.client.force_authenticate(self.user)

    def test_quick_search_matches_first_name_chart_dob_and_phone(self):
        search_terms = ["Mia", "MRN 100", "1990-04-01", "555-123-4488"]

        for search_term in search_terms:
            with self.subTest(search_term=search_term):
                response = self.client.get(
                    "/v1/patients/",
                    {"search": search_term},
                    HTTP_HOST="localhost:8000",
                )

                self.assertEqual(response.status_code, 200)
                self.assertEqual(
                    [item["id"] for item in response.data],
                    [self.patient.id],
                )

    def test_patient_chart_number_auto_assigns_next_numeric_step(self):
        next_patient = Patient.objects.create(
            facility=self.facility,
            first_name="Noah",
            last_name="Rivera",
            date_of_birth=date(1992, 6, 2),
            gender=self.gender,
        )

        self.assertEqual(next_patient.chart_number, "110")

    def test_patient_chart_number_starts_per_facility_at_100(self):
        second_facility = Facility.objects.create(
            organization=self.organization,
            name="East Clinic",
            timezone="America/New_York",
        )
        first_patient = Patient.objects.create(
            facility=second_facility,
            first_name="Ava",
            last_name="Chen",
            date_of_birth=date(1995, 2, 14),
            gender=second_facility.patient_genders.first(),
        )

        self.assertEqual(first_patient.chart_number, "100")

    def test_patient_chart_number_rejects_non_numeric_values(self):
        patient = Patient(
            facility=self.facility,
            first_name="Leo",
            last_name="Nguyen",
            date_of_birth=date(1991, 8, 9),
            gender=self.gender,
            chart_number="MRN-200",
        )

        with self.assertRaises(ValidationError):
            patient.full_clean()

    def test_document_categories_can_be_managed_by_permitted_user(self):
        list_response = self.client.get(
            "/v1/patients/document-categories/",
            {"facility_id": self.facility.id},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(list_response.status_code, 200)
        self.assertGreaterEqual(len(list_response.data), 7)
        protected_category = next(
            item for item in list_response.data if item["code"] == "lab"
        )
        self.assertTrue(protected_category["is_system"])
        self.assertFalse(protected_category["can_delete"])

        create_response = self.client.post(
            f"/v1/patients/document-categories/?facility_id={self.facility.id}",
            {"name": "Billing Documents", "sort_order": 60},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(create_response.data["code"], "billing-documents")
        self.assertTrue(create_response.data["can_delete"])

        category_id = create_response.data["id"]
        update_response = self.client.patch(
            (
                f"/v1/patients/document-categories/{category_id}/"
                f"?facility_id={self.facility.id}"
            ),
            {"name": "Billing", "sort_order": 15},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.data["name"], "Billing")
        self.assertEqual(update_response.data["sort_order"], 15)

        delete_response = self.client.delete(
            (
                f"/v1/patients/document-categories/{category_id}/"
                f"?facility_id={self.facility.id}"
            ),
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(delete_response.status_code, 204)
        self.assertFalse(PatientDocumentCategory.objects.get(pk=category_id).is_active)

    def test_document_category_delete_blocks_system_and_used_categories(self):
        list_response = self.client.get(
            "/v1/patients/document-categories/",
            {"facility_id": self.facility.id},
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(list_response.status_code, 200)

        system_category = next(
            item for item in list_response.data if item["code"] == "admin"
        )
        rename_response = self.client.patch(
            (
                f"/v1/patients/document-categories/{system_category['id']}/"
                f"?facility_id={self.facility.id}"
            ),
            {"name": "Admin Records"},
            format="json",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(rename_response.status_code, 200)
        self.assertEqual(rename_response.data["name"], "Admin Records")

        system_delete_response = self.client.delete(
            (
                f"/v1/patients/document-categories/{system_category['id']}/"
                f"?facility_id={self.facility.id}"
            ),
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(system_delete_response.status_code, 400)

        custom_category = PatientDocumentCategory.objects.create(
            facility=self.facility,
            name="Prior Authorizations",
            sort_order=90,
        )
        PatientDocument.objects.create(
            patient=self.patient,
            name="Authorization.pdf",
            category=custom_category.code,
            file_url="https://example.com/authorization.pdf",
        )

        used_delete_response = self.client.delete(
            (
                f"/v1/patients/document-categories/{custom_category.id}/"
                f"?facility_id={self.facility.id}"
            ),
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(used_delete_response.status_code, 400)

    def test_document_response_hides_storage_internals(self):
        PatientDocument.objects.create(
            patient=self.patient,
            name="Clinical note.pdf",
            category="admin",
            storage_key="patients/1/private.pdf",
            file_url="https://example.com/private.pdf",
        )

        response = self.client.get(
            "/v1/patients/documents/",
            {
                "facility_id": self.facility.id,
                "patient_id": self.patient.id,
            },
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertNotIn("storage_key", response.data[0])
        self.assertNotIn("file_url", response.data[0])
        self.assertNotIn("url", response.data[0])

    def test_document_category_management_requires_permission(self):
        self.staff.role = StaffRole.objects.get(facility=self.facility, code="staff")
        self.staff.save()

        response = self.client.post(
            f"/v1/patients/document-categories/?facility_id={self.facility.id}",
            {"name": "Restricted"},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 403)

    def test_search_matches_full_name_in_common_orders(self):
        search_terms = ["Mia Martinez", "Martinez Mia", "Martinez, Mia"]

        for search_term in search_terms:
            with self.subTest(search_term=search_term):
                response = self.client.get(
                    "/v1/patients/",
                    {"search": search_term},
                    HTTP_HOST="localhost:8000",
                )

                self.assertEqual(response.status_code, 200)
                self.assertEqual(
                    [item["id"] for item in response.data],
                    [self.patient.id],
                )

    def test_structured_name_search_matches_full_name(self):
        response = self.client.get(
            "/v1/patients/",
            {"name": "Mia Martinez"},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item["id"] for item in response.data],
            [self.patient.id],
        )

    def test_patient_response_hides_full_ssn(self):
        response = self.client.get(
            f"/v1/patients/{self.patient.id}/",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("ssn", response.data)
        self.assertEqual(response.data["ssn_last4"], "6789")

    def test_patient_response_derives_last4_from_full_ssn(self):
        Patient.objects.filter(pk=self.patient.pk).update(ssn_last4="0000")

        response = self.client.get(
            f"/v1/patients/{self.patient.id}/",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("ssn", response.data)
        self.assertEqual(response.data["ssn_last4"], "6789")

    def test_reveal_ssn_is_explicit_and_audited(self):
        response = self.client.get(
            f"/v1/patients/{self.patient.id}/reveal-ssn/",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["ssn"], "123456789")
        self.assertTrue(
            AuditEvent.objects.filter(
                actor=self.user,
                patient=self.patient,
                action="view",
                summary="Revealed patient SSN",
            ).exists()
        )

    def test_update_without_ssn_keeps_existing_ssn(self):
        response = self.client.put(
            f"/v1/patients/{self.patient.id}/",
            {
                "first_name": "Mia",
                "last_name": "Martinez",
                "date_of_birth": "1990-04-01",
                "gender": self.gender.id,
                "email": "mia.updated@example.com",
                "phones": [
                    {
                        "number": "555-123-4488",
                        "label": "cell",
                        "is_primary": True,
                    }
                ],
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.patient.refresh_from_db()
        self.assertEqual(self.patient.ssn, "123456789")

    def test_phone_update_rejects_too_many_digits(self):
        response = self.client.patch(
            f"/v1/patients/{self.patient.id}/",
            {
                "phones": [
                    {
                        "number": "555-123-448899",
                        "label": "cell",
                        "is_primary": True,
                    }
                ],
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("phones", response.data)

    def test_phone_update_honors_requested_primary_phone(self):
        response = self.client.patch(
            f"/v1/patients/{self.patient.id}/",
            {
                "phones": [
                    {
                        "number": "5551234488",
                        "label": "cell",
                        "is_primary": False,
                    },
                    {
                        "number": "5551234499",
                        "label": "home",
                        "is_primary": True,
                    },
                ],
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.patient.refresh_from_db()
        self.assertEqual(self.patient.phones.get(label="home").is_primary, True)
        self.assertEqual(self.patient.phones.get(label="cell").is_primary, False)
        self.assertEqual(response.data["primary_phone_number"], "5551234499")

    def test_emergency_contact_update_rejects_too_many_phone_digits(self):
        response = self.client.patch(
            f"/v1/patients/{self.patient.id}/",
            {
                "emergency_contacts": [
                    {
                        "name": "Emergency Contact",
                        "relationship": "Sibling",
                        "phone_number": "555-123-448899",
                        "is_primary": True,
                    }
                ],
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("emergency_contacts", response.data)

    def test_emergency_contact_update_replaces_invalid_legacy_phone(self):
        Patient.objects.filter(pk=self.patient.pk).update(
            emergency_contact_name="Old Contact",
            emergency_contact_relationship="Sibling",
            emergency_contact_phone="555123448899",
        )
        PatientEmergencyContact.objects.create(
            patient=self.patient,
            name="Old Contact",
            relationship="Sibling",
            phone_number="555-123-4488",
            is_primary=True,
        )

        response = self.client.patch(
            f"/v1/patients/{self.patient.id}/",
            {
                "emergency_contacts": [
                    {
                        "name": "Emergency Contact",
                        "relationship": "Sibling",
                        "phone_number": "5551234499",
                        "is_primary": True,
                    }
                ],
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.patient.refresh_from_db()
        self.assertEqual(self.patient.emergency_contact_phone, "5551234499")
        self.assertEqual(self.patient.emergency_contacts.count(), 1)

    def test_ssn_update_rejects_invalid_digit_count(self):
        response = self.client.patch(
            f"/v1/patients/{self.patient.id}/",
            {"ssn": "1234567890"},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("ssn", response.data)

    def test_patch_demographics_accepts_race_and_ethnicity_updates(self):
        self.patient.race_declined = True
        self.patient.ethnicity_declined = True
        self.patient.save(update_fields=["race_declined", "ethnicity_declined"])

        response = self.client.patch(
            f"/v1/patients/{self.patient.id}/",
            {
                "race": "asian",
                "race_declined": False,
                "ethnicity": "hispanic_or_latino",
                "ethnicity_declined": False,
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.patient.refresh_from_db()
        self.assertEqual(self.patient.race, "asian")
        self.assertFalse(self.patient.race_declined)
        self.assertEqual(self.patient.ethnicity, "hispanic_or_latino")
        self.assertFalse(self.patient.ethnicity_declined)

    def test_partial_registration_patch_does_not_require_existing_phone(self):
        self.patient.phones.all().delete()

        response = self.client.patch(
            f"/v1/patients/{self.patient.id}/",
            {"race": "white", "race_declined": False},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.patient.refresh_from_db()
        self.assertEqual(self.patient.race, "white")
        self.assertFalse(self.patient.race_declined)

    def test_destroy_soft_deletes_patient_and_preserves_related_records(self):
        document = PatientDocument.objects.create(
            patient=self.patient,
            name="Clinical note.pdf",
            category="admin",
            file_url="https://example.com/private.pdf",
        )
        phone_id = self.patient.phones.first().id

        response = self.client.delete(
            f"/v1/patients/{self.patient.id}/",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 204)
        self.patient.refresh_from_db()
        self.assertFalse(self.patient.is_active)
        self.assertTrue(PatientPhone.objects.filter(pk=phone_id).exists())
        self.assertTrue(PatientDocument.objects.filter(pk=document.pk).exists())
        self.assertTrue(
            AuditEvent.objects.filter(
                actor=self.user,
                patient=self.patient,
                action="delete",
                model_name="patient",
            ).exists()
        )
