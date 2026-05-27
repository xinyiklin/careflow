from datetime import date

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.exceptions import PermissionDenied
from rest_framework.test import APIRequestFactory, APITestCase

from facilities.models import Facility, Staff, StaffRole
from organizations.models import Organization, OrganizationMembership
from patients.models import Patient, PatientEmergencyContact, PatientPhone
from users.permissions import IsPortalPatient
from users.portal import PatientPortalAccount
from users.portal_access import get_patient_for_user

User = get_user_model()


class PortalTestMixin:
    """Build a minimal organization/facility/patient graph for portal tests."""

    def setUp(self):
        super().setUp()
        self.organization = Organization.objects.create(
            name="Portal Test Org",
            slug="portal-test-org",
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Portal Test Clinic",
            timezone="America/New_York",
        )
        self.gender = self.facility.patient_genders.first()
        self.patient = Patient.objects.create(
            facility=self.facility,
            first_name="Riley",
            last_name="Quinn",
            date_of_birth=date(1992, 7, 14),
            gender=self.gender,
        )

    def _make_portal_user(self, username="portal_user", email="portal@example.com"):
        return User.objects.create_user(
            username=username,
            password="testpass123",
            email=email,
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
        return user


class PatientPortalAccountModelTests(PortalTestMixin, TestCase):
    def test_create_portal_account_links_user_to_patient(self):
        user = self._make_portal_user()

        account = PatientPortalAccount.objects.create(
            user=user,
            patient=self.patient,
        )

        self.assertEqual(user.portal_account, account)
        self.assertEqual(account.patient, self.patient)
        self.assertTrue(account.is_active)
        self.assertIsNotNone(account.created_at)
        self.assertIsNotNone(account.updated_at)
        self.assertIsNone(account.last_login_at)

    def test_rejects_user_with_organization_membership(self):
        clinician = self._make_clinician_user()

        account = PatientPortalAccount(user=clinician, patient=self.patient)

        with self.assertRaises(ValidationError):
            account.full_clean()

    def test_rejects_user_with_staff_profile(self):
        clinician = self._make_clinician_user()
        Staff.objects.create(
            user=clinician,
            facility=self.facility,
            role=StaffRole.objects.get(facility=self.facility, code="staff"),
            is_active=True,
        )

        account = PatientPortalAccount(user=clinician, patient=self.patient)

        with self.assertRaises(ValidationError):
            account.full_clean()

    def test_str_representation(self):
        user = self._make_portal_user()
        account = PatientPortalAccount.objects.create(
            user=user,
            patient=self.patient,
        )

        self.assertIn(user.username, str(account))
        self.assertIn("PortalAccount", str(account))


class IsPortalPatientPermissionTests(PortalTestMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.factory = APIRequestFactory()

    def _make_request(self, user):
        request = self.factory.get("/v1/portal/me/")
        request.user = user
        return request

    def test_anonymous_user_is_denied(self):
        request = self._make_request(AnonymousUser())

        self.assertFalse(IsPortalPatient().has_permission(request, view=None))

    def test_clinician_without_portal_account_is_denied(self):
        clinician = self._make_clinician_user()
        request = self._make_request(clinician)

        self.assertFalse(IsPortalPatient().has_permission(request, view=None))

    def test_active_portal_account_is_allowed(self):
        user = self._make_portal_user()
        PatientPortalAccount.objects.create(user=user, patient=self.patient)
        request = self._make_request(user)

        self.assertTrue(IsPortalPatient().has_permission(request, view=None))

    def test_inactive_portal_account_is_denied(self):
        user = self._make_portal_user()
        PatientPortalAccount.objects.create(
            user=user,
            patient=self.patient,
            is_active=False,
        )
        request = self._make_request(user)

        self.assertFalse(IsPortalPatient().has_permission(request, view=None))


class GetPatientForUserTests(PortalTestMixin, TestCase):
    def test_raises_permission_denied_for_clinician_without_portal_account(self):
        clinician = self._make_clinician_user()

        with self.assertRaises(PermissionDenied):
            get_patient_for_user(clinician)

    def test_returns_linked_patient_for_active_portal_account(self):
        user = self._make_portal_user()
        PatientPortalAccount.objects.create(user=user, patient=self.patient)

        self.assertEqual(get_patient_for_user(user), self.patient)

    def test_raises_permission_denied_for_inactive_portal_account(self):
        user = self._make_portal_user()
        PatientPortalAccount.objects.create(
            user=user,
            patient=self.patient,
            is_active=False,
        )

        with self.assertRaises(PermissionDenied):
            get_patient_for_user(user)


PORTAL_FORBIDDEN_KEYS = {
    "ssn",
    "ssn_last4",
    "chart_number",
    "created_by",
    "updated_by",
    "created_by_name",
    "updated_by_name",
    "pcp",
    "pcp_name",
    "referring_provider",
    "referring_provider_name",
}


class PortalMeViewTests(PortalTestMixin, APITestCase):
    """End-to-end tests for ``GET /v1/portal/me/``."""

    def setUp(self):
        super().setUp()
        # Give the patient enough surface area to test the serializer's
        # derived fields (primary phone, primary emergency contact).
        self.patient.email = "riley@example.com"
        self.patient.pronouns = "they/them"
        self.patient.preferred_language = "English"
        self.patient.save()

        PatientPhone.objects.create(
            patient=self.patient,
            number="2025550199",
            label="cell",
            is_primary=True,
        )
        PatientPhone.objects.create(
            patient=self.patient,
            number="2025550100",
            label="home",
            is_primary=False,
        )
        PatientEmergencyContact.objects.create(
            patient=self.patient,
            name="Sky Quinn",
            relationship="Sibling",
            phone_number="2025550150",
            is_primary=True,
        )

    def test_anonymous_request_returns_401(self):
        response = self.client.get("/v1/portal/me/")
        self.assertEqual(response.status_code, 401)

    def test_clinician_without_portal_account_returns_403(self):
        clinician = self._make_clinician_user()
        self.client.force_authenticate(clinician)

        response = self.client.get("/v1/portal/me/")
        self.assertEqual(response.status_code, 403)

    def test_inactive_portal_account_returns_403(self):
        user = self._make_portal_user()
        PatientPortalAccount.objects.create(
            user=user,
            patient=self.patient,
            is_active=False,
        )
        self.client.force_authenticate(user)

        response = self.client.get("/v1/portal/me/")
        self.assertEqual(response.status_code, 403)

    def test_active_portal_account_returns_own_profile(self):
        user = self._make_portal_user()
        PatientPortalAccount.objects.create(user=user, patient=self.patient)
        self.client.force_authenticate(user)

        response = self.client.get("/v1/portal/me/")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], self.patient.id)
        self.assertEqual(data["first_name"], "Riley")
        self.assertEqual(data["last_name"], "Quinn")
        self.assertEqual(data["email"], "riley@example.com")
        self.assertEqual(data["primary_phone_number"], "2025550199")
        self.assertEqual(data["facility_name"], "Portal Test Clinic")
        self.assertEqual(data["facility_timezone"], "America/New_York")
        self.assertEqual(data["preferred_pharmacy_name"], "")
        contact = data["primary_emergency_contact"]
        self.assertEqual(contact["name"], "Sky Quinn")
        self.assertEqual(contact["relationship"], "Sibling")
        self.assertEqual(contact["phone_number"], "2025550150")

    def test_portal_profile_excludes_clinician_and_phi_fields(self):
        user = self._make_portal_user()
        PatientPortalAccount.objects.create(user=user, patient=self.patient)
        self.client.force_authenticate(user)

        response = self.client.get("/v1/portal/me/")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        leaked = PORTAL_FORBIDDEN_KEYS & set(data.keys())
        self.assertFalse(
            leaked,
            f"Portal profile must not expose clinician/PHI fields: {sorted(leaked)}",
        )
