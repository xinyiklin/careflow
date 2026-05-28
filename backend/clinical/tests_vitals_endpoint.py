"""Integration tests for the clinician /v1/clinical/vitals/ endpoint."""

from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from clinical.models import Encounter, ProgressNote, Vitals
from facilities.models import Facility, Staff, StaffRole
from organizations.models import Organization, OrganizationMembership
from patients.models import Patient

User = get_user_model()


class VitalsEndpointTestMixin:
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.organization = Organization.objects.create(
            name="Vitals API Org", slug="vitals-api"
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Vitals API Clinic",
            timezone="America/Los_Angeles",
        )
        self.user = User.objects.create_user(
            username="ma_user",
            password="x",
            email="ma_user@example.com",
            first_name="Mary",
            last_name="Assistant",
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
            title=self.facility.titles.get(code="md"),
            is_active=True,
            is_default=True,
        )
        self.gender = self.facility.patient_genders.first()
        self.patient = Patient.objects.create(
            facility=self.facility,
            first_name="Vital",
            last_name="Patient",
            date_of_birth=date(1990, 1, 1),
            gender=self.gender,
        )
        self.encounter = Encounter.objects.create(
            patient=self.patient,
            facility=self.facility,
            reason="Annual visit",
            started_at=timezone.now(),
        )
        self.client.force_authenticate(self.user)
        # Active facility cookie is what the FacilityScopedViewSetMixin expects.
        self.client.cookies.load({"careflow_active_facility": str(self.facility.id)})

    def _list(self):
        return self.client.get(f"/v1/clinical/vitals/?encounter={self.encounter.id}")

    def _create(self, **overrides):
        payload = {
            "encounter": self.encounter.id,
            "bp_systolic": 120,
            "bp_diastolic": 80,
            "heart_rate_bpm": 72,
            "temperature_c": "36.8",
            "height_cm": "175",
            "weight_kg": "70.5",
        }
        payload.update(overrides)
        return self.client.post("/v1/clinical/vitals/", payload, format="json")


class VitalsEndpointTests(VitalsEndpointTestMixin, TestCase):
    def test_list_empty_returns_empty_array(self):
        response = self._list()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_create_records_vitals_and_sets_recorded_by(self):
        response = self._create()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["bp_systolic"], 120)
        self.assertEqual(response.data["bmi"], "23.0")
        vitals = Vitals.objects.get(encounter=self.encounter)
        self.assertEqual(vitals.recorded_by, self.user)
        self.assertEqual(vitals.recorded_by_name, "Mary Assistant")

    def test_list_returns_created_vitals(self):
        self._create()
        response = self._list()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_update_existing_vitals(self):
        self._create()
        vitals = Vitals.objects.get(encounter=self.encounter)
        response = self.client.patch(
            f"/v1/clinical/vitals/{vitals.id}/",
            {"bp_systolic": 135},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        vitals.refresh_from_db()
        self.assertEqual(vitals.bp_systolic, 135)

    def test_blocks_create_on_signed_encounter(self):
        note = ProgressNote.objects.create(encounter=self.encounter)
        note.sign(self.user)
        response = self._create()
        self.assertEqual(response.status_code, 400)

    def test_blocks_update_on_signed_encounter(self):
        self._create()
        vitals = Vitals.objects.get(encounter=self.encounter)
        note = ProgressNote.objects.create(encounter=self.encounter)
        note.sign(self.user)
        response = self.client.patch(
            f"/v1/clinical/vitals/{vitals.id}/",
            {"bp_systolic": 130},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_rejects_diastolic_at_or_above_systolic(self):
        response = self._create(bp_systolic=120, bp_diastolic=120)
        self.assertEqual(response.status_code, 400)

    def test_anonymous_returns_401(self):
        self.client.logout()
        self.client.force_authenticate(None)
        response = self._list()
        self.assertEqual(response.status_code, 401)
