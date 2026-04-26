from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from facilities.models import Facility, Staff, StaffRole
from organizations.models import Organization, OrganizationMembership

User = get_user_model()


class DemoLoginViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @override_settings(DEMO_MODE=True, DEMO_USERNAME="demo_admin")
    def test_demo_login_returns_tokens_and_serialized_user(self):
        user = User.objects.create_user(
            username="demo_admin",
            password="testpass123",
            email="demo@example.com",
            first_name="Demo",
            last_name="Admin",
        )

        response = self.client.post("/v1/users/demo-login/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertNotIn("refresh", response.data)
        self.assertIn("careflow_refresh", response.cookies)
        self.assertTrue(response.cookies["careflow_refresh"]["httponly"])
        self.assertTrue(response.data["is_demo"])
        self.assertEqual(response.data["user"]["id"], user.id)
        self.assertEqual(response.data["user"]["username"], user.username)

    @override_settings(DEMO_MODE=True, DEMO_USERNAME="demo_admin")
    def test_refresh_token_can_use_http_only_cookie(self):
        User.objects.create_user(
            username="demo_admin",
            password="testpass123",
            email="demo@example.com",
        )
        login_response = self.client.post("/v1/users/demo-login/")
        self.client.cookies["careflow_refresh"] = login_response.cookies[
            "careflow_refresh"
        ].value

        response = self.client.post("/v1/users/token/refresh/", {}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertNotIn("refresh", response.data)

    @override_settings(DEMO_MODE=False, DEMO_USERNAME="demo_admin")
    def test_demo_login_is_blocked_when_demo_mode_is_disabled(self):
        response = self.client.post("/v1/users/demo-login/")

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["detail"], "Demo mode is disabled.")


class RegisterViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_public_registration_is_disabled_by_default(self):
        response = self.client.post(
            "/v1/users/register/",
            {
                "username": "new_user",
                "email": "new@example.com",
                "password": "testpass123A!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["detail"], "Public registration is disabled.")

    @override_settings(ALLOW_PUBLIC_REGISTRATION=True)
    def test_public_registration_can_be_enabled(self):
        response = self.client.post(
            "/v1/users/register/",
            {
                "username": "new_user",
                "email": "new@example.com",
                "password": "testpass123A!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["username"], "new_user")


class UserPreferenceViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="pref_user",
            password="testpass123",
            email="pref@example.com",
        )
        self.client.force_authenticate(user=self.user)

    def test_profile_includes_empty_preferences_by_default(self):
        response = self.client.get("/v1/users/me/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["preferences"], {})

    def test_user_can_update_preferences(self):
        response = self.client.patch(
            "/v1/users/me/preferences/",
            {
                "preferences": {
                    "defaultLandingPage": "schedule",
                    "recentPatientsCount": 8,
                }
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["preferences"]["defaultLandingPage"],
            "schedule",
        )

        profile_response = self.client.get("/v1/users/me/")
        self.assertEqual(
            profile_response.data["preferences"]["recentPatientsCount"],
            8,
        )

    def test_preferences_must_be_object(self):
        response = self.client.patch(
            "/v1/users/me/preferences/",
            {"preferences": ["bad"]},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def create_staff_membership(self, facility_name="Clinic A", is_default=True):
        organization, _ = Organization.objects.get_or_create(
            slug="careflow-health",
            defaults={"name": "CareFlow Health"},
        )
        facility = Facility.objects.create(
            organization=organization,
            name=facility_name,
            timezone="America/New_York",
        )
        OrganizationMembership.objects.get_or_create(
            user=self.user,
            organization=organization,
            defaults={
                "role": OrganizationMembership.ROLE_ADMIN,
                "is_active": True,
            },
        )
        Staff.objects.create(
            user=self.user,
            facility=facility,
            role=StaffRole.objects.get(facility=facility, code="admin"),
            is_active=True,
            is_default=is_default,
        )
        return facility

    def test_profile_preferences_include_assigned_last_facility(self):
        facility = self.create_staff_membership()

        response = self.client.get("/v1/users/me/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["preferences"]["lastFacilityId"],
            str(facility.id),
        )

    def test_blank_last_facility_normalizes_to_assigned_facility(self):
        facility = self.create_staff_membership()

        response = self.client.patch(
            "/v1/users/me/preferences/",
            {"preferences": {"lastFacilityId": ""}},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["preferences"]["lastFacilityId"],
            str(facility.id),
        )

    def test_last_facility_must_belong_to_user(self):
        self.create_staff_membership("Clinic A")
        other_facility = Facility.objects.create(
            organization=Organization.objects.get(slug="careflow-health"),
            name="Clinic B",
            timezone="America/New_York",
        )

        response = self.client.patch(
            "/v1/users/me/preferences/",
            {"preferences": {"lastFacilityId": str(other_facility.id)}},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
