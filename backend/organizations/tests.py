from django.test import TestCase
from rest_framework.test import APIClient

from facilities.models import Facility, Staff, StaffRole
from patients.models import Pharmacy

from .models import Organization, OrganizationMembership, OrganizationPharmacyPreference


class OrganizationPharmacyPermissionTests(TestCase):
    def setUp(self):
        self.organization = Organization.objects.create(
            name="CareFlow Health",
            slug="careflow-health",
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Main Clinic",
            timezone="America/New_York",
        )
        self.admin_role = StaffRole.objects.get(
            facility=self.facility,
            code="admin",
        )
        self.staff_role = StaffRole.objects.get(
            facility=self.facility,
            code="staff",
        )
        self.client = APIClient(HTTP_HOST="localhost:8000")

    def create_member_user(self, username, role, staff_role):
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.create_user(
            username=username,
            password="testpass123",
            email=f"{username}@example.com",
        )
        OrganizationMembership.objects.create(
            user=user,
            organization=self.organization,
            role=role,
            is_active=True,
        )
        Staff.objects.create(
            user=user,
            facility=self.facility,
            role=staff_role,
            is_active=True,
        )
        return user

    def test_facility_staff_with_pharmacy_permission_can_manage_pharmacies(self):
        user = self.create_member_user(
            "pharmacy_manager",
            OrganizationMembership.ROLE_MEMBER,
            self.admin_role,
        )
        self.client.force_authenticate(user=user)

        response = self.client.post(
            "/v1/organizations/pharmacies/",
            {
                "pharmacy": {
                    "name": "CareFlow Pharmacy",
                    "source": "custom",
                    "service_type": "retail",
                    "accepts_erx": True,
                    "is_active": True,
                },
                "is_preferred": True,
                "is_hidden": False,
                "is_active": True,
                "sort_order": 10,
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["pharmacy"]["name"], "CareFlow Pharmacy")

    def test_staff_without_pharmacy_permission_cannot_manage_pharmacies(self):
        user = self.create_member_user(
            "front_desk",
            OrganizationMembership.ROLE_MEMBER,
            self.staff_role,
        )
        self.client.force_authenticate(user=user)

        response = self.client.get(
            "/v1/organizations/pharmacies/",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 403)

    def test_shared_pharmacy_edit_clones_instead_of_mutating_global_record(self):
        user = self.create_member_user(
            "pharmacy_admin",
            OrganizationMembership.ROLE_ADMIN,
            self.admin_role,
        )
        other_org = Organization.objects.create(
            name="Other Health",
            slug="other-health",
        )
        pharmacy = Pharmacy.objects.create(
            name="Shared Directory Pharmacy",
            source=Pharmacy.SOURCE_DIRECTORY,
            service_type=Pharmacy.SERVICE_RETAIL,
            is_active=True,
        )
        preference = OrganizationPharmacyPreference.objects.create(
            organization=self.organization,
            pharmacy=pharmacy,
        )
        OrganizationPharmacyPreference.objects.create(
            organization=other_org,
            pharmacy=pharmacy,
        )
        self.client.force_authenticate(user=user)

        response = self.client.patch(
            f"/v1/organizations/pharmacies/{preference.pk}/",
            {
                "pharmacy": {
                    "name": "Main Clinic Pharmacy",
                    "phone_number": "555-123-4567",
                }
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        pharmacy.refresh_from_db()
        preference.refresh_from_db()
        self.assertEqual(pharmacy.name, "Shared Directory Pharmacy")
        self.assertNotEqual(preference.pharmacy_id, pharmacy.id)
        self.assertEqual(preference.pharmacy.name, "Main Clinic Pharmacy")
        self.assertEqual(preference.pharmacy.source, Pharmacy.SOURCE_CUSTOM)

    def test_custom_pharmacy_cannot_be_attached_by_global_id(self):
        user = self.create_member_user(
            "pharmacy_admin_two",
            OrganizationMembership.ROLE_ADMIN,
            self.admin_role,
        )
        custom_pharmacy = Pharmacy.objects.create(
            name="Other Custom Pharmacy",
            source=Pharmacy.SOURCE_CUSTOM,
            service_type=Pharmacy.SERVICE_RETAIL,
            is_active=True,
        )
        self.client.force_authenticate(user=user)

        response = self.client.post(
            "/v1/organizations/pharmacies/",
            {
                "pharmacy_id": custom_pharmacy.id,
                "is_preferred": True,
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("pharmacy_id", response.data)
