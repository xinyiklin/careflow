from datetime import date

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from facilities.models import Facility, Staff, StaffRole
from organizations.models import Organization, OrganizationMembership
from patients.models import Patient
from users.portal import PatientPortalAccount

from .models import PatientAllergy

User = get_user_model()


class PortalAllergyListViewTests(APITestCase):
    """End-to-end tests for ``GET /v1/portal/allergies/``."""

    URL = "/v1/portal/allergies/"

    def setUp(self):
        self.organization = Organization.objects.create(
            name="Portal Allergies Org",
            slug="portal-allergies-org",
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Portal Allergies Clinic",
            timezone="America/New_York",
        )
        gender = self.facility.patient_genders.first()
        self.patient_a = Patient.objects.create(
            facility=self.facility,
            first_name="Alice",
            last_name="Anderson",
            date_of_birth=date(1980, 1, 1),
            gender=gender,
        )
        self.patient_b = Patient.objects.create(
            facility=self.facility,
            first_name="Bob",
            last_name="Brown",
            date_of_birth=date(1985, 2, 2),
            gender=gender,
        )

        self.portal_user_a = User.objects.create_user(
            username="portal_a",
            password="testpass123",
            email="portal_a@example.com",
        )
        PatientPortalAccount.objects.create(
            user=self.portal_user_a,
            patient=self.patient_a,
        )
        self.portal_user_b = User.objects.create_user(
            username="portal_b",
            password="testpass123",
            email="portal_b@example.com",
        )
        PatientPortalAccount.objects.create(
            user=self.portal_user_b,
            patient=self.patient_b,
        )

        # Inactive allergy first by save order so we can confirm ordering.
        self.inactive_a = PatientAllergy.objects.create(
            patient=self.patient_a,
            facility=self.facility,
            allergen="Aspirin",
            reaction="Hives",
            severity=PatientAllergy.SEVERITY_MILD,
            status=PatientAllergy.STATUS_RESOLVED,
        )
        self.active_mild_a = PatientAllergy.objects.create(
            patient=self.patient_a,
            facility=self.facility,
            allergen="Peanut",
            reaction="Tingling",
            severity=PatientAllergy.SEVERITY_MILD,
            status=PatientAllergy.STATUS_ACTIVE,
        )
        self.active_severe_a = PatientAllergy.objects.create(
            patient=self.patient_a,
            facility=self.facility,
            allergen="Penicillin",
            reaction="Anaphylaxis",
            severity=PatientAllergy.SEVERITY_LIFE_THREATENING,
            status=PatientAllergy.STATUS_ACTIVE,
        )
        self.active_b = PatientAllergy.objects.create(
            patient=self.patient_b,
            facility=self.facility,
            allergen="Latex",
            reaction="Rash",
            severity=PatientAllergy.SEVERITY_MODERATE,
            status=PatientAllergy.STATUS_ACTIVE,
        )

    def _make_clinician_user(self):
        user = User.objects.create_user(
            username="clinician_user",
            password="testpass123",
            email="clinician@example.com",
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
            role=StaffRole.objects.get(facility=self.facility, code="staff"),
            is_active=True,
        )
        return user

    def test_anonymous_request_returns_401(self):
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 401)

    def test_clinician_without_portal_account_returns_403(self):
        self.client.force_authenticate(self._make_clinician_user())
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 403)

    def test_inactive_portal_account_returns_403(self):
        user = User.objects.create_user(
            username="portal_inactive",
            password="testpass123",
            email="inactive@example.com",
        )
        patient = Patient.objects.create(
            facility=self.facility,
            first_name="Inactive",
            last_name="Patient",
            date_of_birth=date(1970, 3, 3),
            gender=self.facility.patient_genders.first(),
        )
        PatientPortalAccount.objects.create(
            user=user,
            patient=patient,
            is_active=False,
        )
        self.client.force_authenticate(user)
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 403)

    def test_returns_own_allergies_active_first_by_severity(self):
        self.client.force_authenticate(self.portal_user_a)

        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        ids = [row["id"] for row in data]

        # Active life-threatening, active mild, then non-active.
        self.assertEqual(
            ids,
            [self.active_severe_a.id, self.active_mild_a.id, self.inactive_a.id],
        )
        self.assertNotIn(self.active_b.id, ids)

    def test_does_not_leak_other_patients_allergies(self):
        self.client.force_authenticate(self.portal_user_a)

        response = self.client.get(self.URL)
        ids = {row["id"] for row in response.json()}

        self.assertNotIn(self.active_b.id, ids)

    def test_portal_allergy_serializer_excludes_clinician_fields(self):
        self.client.force_authenticate(self.portal_user_a)

        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data, "Expected at least one allergy")

        forbidden = {
            "created_by",
            "updated_by",
            "facility",
            "patient_chart_number",
            "patient_name",
        }
        leaked = forbidden & set(data[0].keys())
        self.assertFalse(
            leaked,
            f"Portal allergy response must not expose: {sorted(leaked)}",
        )
