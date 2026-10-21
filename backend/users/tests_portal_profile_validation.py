"""Portal profile updates validate phone numbers like the clinician path."""

from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from facilities.models import Facility
from organizations.models import Organization
from patients.models import Patient

from .portal import PatientPortalAccount

User = get_user_model()
ME_URL = "/v1/portal/me/"


class PortalProfileValidationTests(TestCase):
    def setUp(self):
        self.client = APIClient(HTTP_HOST="localhost:8000")
        organization = Organization.objects.create(
            name="Portal Org", slug="portal-profile-org"
        )
        facility = Facility.objects.create(
            organization=organization,
            name="Portal Clinic",
            timezone="America/New_York",
        )
        self.patient = Patient.objects.create(
            facility=facility,
            first_name="Portal",
            last_name="Patient",
            date_of_birth=date(1991, 2, 2),
            gender=facility.patient_genders.first(),
        )
        self.portal_user = User.objects.create_user(
            username="profile_portal", password="x", email="profile_portal@example.com"
        )
        PatientPortalAccount.objects.create(user=self.portal_user, patient=self.patient)
        self.client.force_authenticate(self.portal_user)

    def test_invalid_primary_phone_is_rejected(self):
        response = self.client.patch(
            ME_URL, {"primary_phone_number": "hello"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("primary_phone_number", response.data)
        self.assertEqual(self.patient.phones.count(), 0)

    def test_invalid_emergency_contact_phone_is_rejected(self):
        response = self.client.patch(
            ME_URL,
            {
                "primary_emergency_contact": {
                    "name": "Sam",
                    "relationship": "sibling",
                    "phone_number": "hello",
                }
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("primary_emergency_contact", response.data)
        self.assertEqual(self.patient.emergency_contacts.count(), 0)

    def test_valid_phone_and_contact_are_saved(self):
        response = self.client.patch(
            ME_URL,
            {
                "primary_phone_number": "3035559988",
                "primary_emergency_contact": {
                    "name": "Sam",
                    "relationship": "sibling",
                    "phone_number": "(303) 555-0101",
                },
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(self.patient.phones.get(is_primary=True).number, "3035559988")
        self.assertEqual(
            self.patient.emergency_contacts.get(is_primary=True).phone_number,
            "(303) 555-0101",
        )
