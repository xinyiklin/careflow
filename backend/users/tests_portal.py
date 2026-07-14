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
from users.tokens import CLINIC_SURFACE, PORTAL_SURFACE, issue_refresh_for_user

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

    def test_save_enforces_clinician_portal_identity_separation(self):
        clinician = self._make_clinician_user()

        with self.assertRaises(ValidationError):
            PatientPortalAccount.objects.create(
                user=clinician,
                patient=self.patient,
            )

    def test_organization_membership_rejects_existing_portal_user(self):
        user = self._make_portal_user()
        PatientPortalAccount.objects.create(user=user, patient=self.patient)

        with self.assertRaises(ValidationError):
            OrganizationMembership.objects.create(
                user=user,
                organization=self.organization,
                role=OrganizationMembership.ROLE_MEMBER,
            )

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

    def test_inactive_patient_is_denied(self):
        user = self._make_portal_user()
        PatientPortalAccount.objects.create(user=user, patient=self.patient)
        self.patient.is_active = False
        self.patient.save(update_fields=["is_active"])

        self.assertFalse(
            IsPortalPatient().has_permission(self._make_request(user), view=None)
        )

    def test_inactive_facility_is_denied(self):
        user = self._make_portal_user()
        PatientPortalAccount.objects.create(user=user, patient=self.patient)
        self.facility.is_active = False
        self.facility.save(update_fields=["is_active"])

        self.assertFalse(
            IsPortalPatient().has_permission(self._make_request(user), view=None)
        )


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

    def test_portal_insurance_policies_exclude_staff_notes(self):
        # `notes` is staff-authored internal commentary and must not reach the
        # patient portal (D002), nor appear in the committed API contract.
        from insurance.models import InsuranceCarrier, PatientInsurancePolicy

        carrier = InsuranceCarrier.objects.create(
            name="Portal Test Plan", payer_id="PTP001"
        )
        PatientInsurancePolicy.objects.create(
            patient=self.patient,
            carrier=carrier,
            member_id="MEM123",
            coverage_order="primary",
            is_active=True,
            notes="INTERNAL: coverage disputed, do not show patient",
        )
        user = self._make_portal_user()
        PatientPortalAccount.objects.create(user=user, patient=self.patient)
        self.client.force_authenticate(user)

        response = self.client.get("/v1/portal/me/")
        self.assertEqual(response.status_code, 200)
        policies = response.json()["insurance_policies"]
        self.assertEqual(len(policies), 1)
        self.assertNotIn("notes", policies[0])
        self.assertNotIn("do not show patient", response.content.decode())

    def test_update_portal_profile_success(self):
        user = self._make_portal_user()
        PatientPortalAccount.objects.create(user=user, patient=self.patient)
        self.client.force_authenticate(user)

        update_data = {
            "preferred_name": "Riles",
            "pronouns": "they/them",
            "preferred_language": "Spanish",
            "email": "riley.new@example.com",
            "primary_phone_number": "3035559988",
            "address": {
                "line_1": "123 New Way",
                "city": "Denver",
                "state": "NY",
                "zip_code": "80202",
            },
            "primary_emergency_contact": {
                "name": "Alex Quinn",
                "relationship": "Parent",
                "phone_number": "3035557766",
            },
        }

        response = self.client.patch("/v1/portal/me/", data=update_data, format="json")
        self.assertEqual(response.status_code, 200)

        # Verify DB updates
        self.patient.refresh_from_db()
        self.assertEqual(self.patient.preferred_name, "Riles")
        self.assertEqual(self.patient.pronouns, "they/them")
        self.assertEqual(self.patient.preferred_language, "Spanish")
        self.assertEqual(self.patient.email, "riley.new@example.com")
        self.assertEqual(
            self.patient.phones.filter(is_primary=True).first().number, "3035559988"
        )
        self.assertEqual(self.patient.address.line_1, "123 New Way")
        self.assertEqual(self.patient.address.city, "Denver")
        self.assertEqual(
            self.patient.emergency_contacts.filter(is_primary=True).first().name,
            "Alex Quinn",
        )
        self.assertEqual(
            self.patient.emergency_contacts.filter(is_primary=True)
            .first()
            .relationship,
            "Parent",
        )
        self.assertEqual(
            self.patient.emergency_contacts.filter(is_primary=True)
            .first()
            .phone_number,
            "3035557766",
        )

    def test_update_portal_profile_read_only_fields_ignored(self):
        user = self._make_portal_user()
        PatientPortalAccount.objects.create(user=user, patient=self.patient)
        self.client.force_authenticate(user)

        update_data = {
            "first_name": "ShouldNotChange",
            "last_name": "ShouldNotChangeEither",
            "date_of_birth": "1990-01-01",
        }

        response = self.client.patch("/v1/portal/me/", data=update_data, format="json")
        self.assertEqual(response.status_code, 200)

        # Verify DB fields did NOT change
        self.patient.refresh_from_db()
        self.assertEqual(self.patient.first_name, "Riley")
        self.assertEqual(self.patient.last_name, "Quinn")
        self.assertEqual(self.patient.date_of_birth, date(1992, 7, 14))


class PortalDemoLoginViewTests(PortalTestMixin, APITestCase):
    DEMO_USERNAME = "patient_demo_test"

    def _make_demo_user_with_portal(self):
        user = User.objects.create_user(username=self.DEMO_USERNAME, password="ignored")
        PatientPortalAccount.objects.create(user=user, patient=self.patient)
        return user

    def test_demo_login_returns_token_when_enabled(self):
        self._make_demo_user_with_portal()
        with self.settings(DEMO_MODE=True, PORTAL_DEMO_USERNAME=self.DEMO_USERNAME):
            response = self.client.post("/v1/portal/demo-login/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertTrue(response.data["is_demo"])
        self.assertIn("careflow_refresh", response.cookies)
        self.assertEqual(response.cookies["careflow_refresh"]["path"], "/v1/portal/")
        self.assertTrue(response.cookies["careflow_refresh"]["httponly"])

    def test_demo_login_rejected_when_disabled(self):
        self._make_demo_user_with_portal()
        with self.settings(DEMO_MODE=False, PORTAL_DEMO_USERNAME=self.DEMO_USERNAME):
            response = self.client.post("/v1/portal/demo-login/")
        self.assertEqual(response.status_code, 403)

    def test_demo_login_500_when_user_missing(self):
        # User does not exist; demo mode on
        with self.settings(DEMO_MODE=True, PORTAL_DEMO_USERNAME="does_not_exist"):
            response = self.client.post("/v1/portal/demo-login/")
        self.assertEqual(response.status_code, 500)

    def test_demo_login_500_when_no_portal_account(self):
        # User exists but no portal account
        User.objects.create_user(username=self.DEMO_USERNAME, password="x")
        with self.settings(DEMO_MODE=True, PORTAL_DEMO_USERNAME=self.DEMO_USERNAME):
            response = self.client.post("/v1/portal/demo-login/")
        self.assertEqual(response.status_code, 500)


class PortalAuthCookieIsolationTests(PortalTestMixin, APITestCase):
    """The portal refresh/logout endpoints write the cookie at /v1/portal/.

    These guard against regressing cross-app session bleed: clinician and
    portal apps share localhost in dev, so cookies are isolated by path.
    """

    DEMO_USERNAME = "patient_demo_cookie_path"

    def _login_demo_patient(self):
        user = User.objects.create_user(username=self.DEMO_USERNAME, password="ignored")
        PatientPortalAccount.objects.create(user=user, patient=self.patient)
        with self.settings(DEMO_MODE=True, PORTAL_DEMO_USERNAME=self.DEMO_USERNAME):
            return self.client.post("/v1/portal/demo-login/")

    def test_portal_refresh_endpoint_works(self):
        login_response = self._login_demo_patient()
        self.assertEqual(login_response.status_code, 200)
        self.client.cookies["careflow_refresh"] = login_response.cookies[
            "careflow_refresh"
        ].value

        response = self.client.post("/v1/portal/auth/refresh/", {}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertNotIn("refresh", response.data)

    def test_portal_refresh_rejects_request_without_cookie(self):
        # Browser would not send a clinic-path cookie to /v1/portal/*; this
        # simulates that by sending no cookie at all.
        response = self.client.post("/v1/portal/auth/refresh/", {}, format="json")
        # SimpleJWT raises a validation error (400) when the refresh value is
        # missing rather than an auth error; either way the caller cannot
        # mint a new access token, which is the protection we care about.
        self.assertIn(response.status_code, (400, 401))

    def test_portal_refresh_rejects_garbage_token(self):
        # If somehow a non-portal value reaches the portal endpoint, the
        # JWT layer rejects it rather than minting a new access token.
        self.client.cookies["careflow_refresh"] = "not-a-real-token"
        response = self.client.post("/v1/portal/auth/refresh/", {}, format="json")
        self.assertEqual(response.status_code, 401)

    def test_portal_logout_clears_portal_scoped_cookie(self):
        login_response = self._login_demo_patient()
        self.assertEqual(login_response.status_code, 200)
        self.client.cookies["careflow_refresh"] = login_response.cookies[
            "careflow_refresh"
        ].value

        response = self.client.post("/v1/portal/auth/logout/")

        self.assertEqual(response.status_code, 204)
        self.assertIn("careflow_refresh", response.cookies)
        self.assertEqual(response.cookies["careflow_refresh"]["path"], "/v1/portal/")


class PortalLoginViewTests(PortalTestMixin, APITestCase):
    """Username/password login at /v1/portal/auth/login/."""

    def test_portal_user_can_log_in_and_refresh(self):
        user = self._make_portal_user()
        PatientPortalAccount.objects.create(user=user, patient=self.patient)

        response = self.client.post(
            "/v1/portal/auth/login/",
            {"username": "portal_user", "password": "testpass123"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertNotIn("refresh", response.data)
        self.assertIn("careflow_refresh", response.cookies)
        self.assertEqual(response.cookies["careflow_refresh"]["path"], "/v1/portal/")

        # The minted token carries the portal surface, so the portal refresh
        # endpoint (which rejects clinic-surface tokens) accepts it.
        self.client.cookies["careflow_refresh"] = response.cookies[
            "careflow_refresh"
        ].value
        refresh = self.client.post("/v1/portal/auth/refresh/", {}, format="json")
        self.assertEqual(refresh.status_code, 200)
        self.assertIn("access", refresh.data)

    def test_portal_login_rejects_user_without_portal_account(self):
        self._make_portal_user(username="no_portal", email="no_portal@example.com")

        response = self.client.post(
            "/v1/portal/auth/login/",
            {"username": "no_portal", "password": "testpass123"},
            format="json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertNotIn("careflow_refresh", response.cookies)

    def test_portal_login_rejects_bad_credentials(self):
        user = self._make_portal_user()
        PatientPortalAccount.objects.create(user=user, patient=self.patient)

        response = self.client.post(
            "/v1/portal/auth/login/",
            {"username": "portal_user", "password": "wrong-password"},
            format="json",
        )

        self.assertEqual(response.status_code, 401)


PORTAL_REFRESH_URL = "/v1/portal/auth/refresh/"
CLINIC_REFRESH_URL = "/v1/users/token/refresh/"


class CrossSurfaceRefreshTokenTests(PortalTestMixin, APITestCase):
    """A refresh token minted for one auth surface must not be replayable
    against the other surface's refresh endpoint.

    The surface claim is set by :func:`users.tokens.issue_refresh_for_user`
    and enforced by ``_SurfaceTokenRefreshSerializer``; a mismatch raises
    ``InvalidToken`` (HTTP 401) before any new access token is minted."""

    def test_clinic_token_rejected_at_portal_refresh_endpoint(self):
        clinician = self._make_clinician_user()
        refresh = issue_refresh_for_user(clinician, CLINIC_SURFACE)

        self.client.cookies["careflow_refresh"] = str(refresh)
        response = self.client.post(PORTAL_REFRESH_URL, {}, format="json")

        self.assertEqual(response.status_code, 401)
        self.assertNotIn("access", response.data)

    def test_portal_token_rejected_at_clinic_refresh_endpoint(self):
        user = self._make_portal_user()
        PatientPortalAccount.objects.create(user=user, patient=self.patient)
        refresh = issue_refresh_for_user(user, PORTAL_SURFACE)

        self.client.cookies["careflow_refresh"] = str(refresh)
        response = self.client.post(CLINIC_REFRESH_URL, {}, format="json")

        self.assertEqual(response.status_code, 401)
        self.assertNotIn("access", response.data)


class SurfaceAuthenticationTests(PortalTestMixin, APITestCase):
    def test_clinic_access_token_is_rejected_by_portal_api(self):
        clinician = self._make_clinician_user()
        refresh = issue_refresh_for_user(clinician, CLINIC_SURFACE)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}"
        )

        response = self.client.get("/v1/portal/me/")

        self.assertEqual(response.status_code, 401)

    def test_portal_access_token_is_rejected_by_clinic_api(self):
        user = self._make_portal_user()
        PatientPortalAccount.objects.create(user=user, patient=self.patient)
        refresh = issue_refresh_for_user(user, PORTAL_SURFACE)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}"
        )

        response = self.client.get("/v1/users/me/")

        self.assertEqual(response.status_code, 401)

    def test_clinic_session_is_rejected_by_portal_api(self):
        self._make_clinician_user()
        self.assertTrue(
            self.client.login(
                username="clinician_user",
                password="testpass123",
            )
        )

        response = self.client.get("/v1/portal/me/")

        self.assertEqual(response.status_code, 401)

    def test_portal_session_is_rejected_by_clinic_api(self):
        user = self._make_portal_user()
        PatientPortalAccount.objects.create(user=user, patient=self.patient)
        self.assertTrue(
            self.client.login(
                username="portal_user",
                password="testpass123",
            )
        )

        response = self.client.get("/v1/users/me/")

        self.assertEqual(response.status_code, 401)

    def test_portal_access_and_refresh_are_revoked_with_patient(self):
        user = self._make_portal_user()
        PatientPortalAccount.objects.create(user=user, patient=self.patient)
        refresh = issue_refresh_for_user(user, PORTAL_SURFACE)
        self.patient.is_active = False
        self.patient.save(update_fields=["is_active"])

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}"
        )
        access_response = self.client.get("/v1/portal/me/")
        self.client.credentials()
        self.client.cookies["careflow_refresh"] = str(refresh)
        refresh_response = self.client.post(
            PORTAL_REFRESH_URL,
            {},
            format="json",
        )

        self.assertEqual(access_response.status_code, 401)
        self.assertEqual(refresh_response.status_code, 401)

    def test_clinic_access_and_refresh_are_revoked_with_membership(self):
        clinician = self._make_clinician_user()
        refresh = issue_refresh_for_user(clinician, CLINIC_SURFACE)
        OrganizationMembership.objects.filter(user=clinician).update(is_active=False)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}"
        )
        access_response = self.client.get("/v1/users/me/")
        self.client.credentials()
        self.client.cookies["careflow_refresh"] = str(refresh)
        refresh_response = self.client.post(
            CLINIC_REFRESH_URL,
            {},
            format="json",
        )

        self.assertEqual(access_response.status_code, 401)
        self.assertEqual(refresh_response.status_code, 401)
