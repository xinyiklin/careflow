"""Integration tests for portal refill-request and pharmacy endpoints.

Covers ``/v1/portal/refill-requests/`` (GET + POST + cancel),
``/v1/portal/pharmacies/``, and
``PATCH /v1/portal/me/preferred-pharmacy/``. All endpoints are gated by
``IsPortalPatient`` and scoped to the requesting patient's facility.
"""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APITestCase

from facilities.models import Facility, Staff, StaffRole
from organizations.models import (
    Organization,
    OrganizationMembership,
    OrganizationPharmacyPreference,
)
from patients.models import Patient, PatientPharmacy, Pharmacy
from shared.models import Address
from users.portal import PatientPortalAccount

from .models import Medication, RefillRequest

User = get_user_model()


class PortalRefillBaseMixin:
    """Shared fixtures: two facilities, two patients with portal accounts, two
    pharmacies — one allowed at facility A, the other only at facility B."""

    def setUp(self):
        super().setUp()
        self.organization = Organization.objects.create(
            name="Portal Refill Org", slug="portal-refill-org"
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Portal Refill Clinic",
            timezone="America/New_York",
        )
        self.other_facility = Facility.objects.create(
            organization=self.organization,
            name="Other Refill Clinic",
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
            username="portal_a", password="x", email="a@example.com"
        )
        PatientPortalAccount.objects.create(
            user=self.portal_user_a, patient=self.patient_a
        )
        self.portal_user_b = User.objects.create_user(
            username="portal_b", password="x", email="b@example.com"
        )
        PatientPortalAccount.objects.create(
            user=self.portal_user_b, patient=self.patient_b
        )

        # Pharmacy reachable by the facility (via org-level preference).
        self.address_in = Address.objects.create(
            line_1="100 Main St",
            line_2="Suite 1",
            city="Brooklyn",
            state="NY",
            zip_code="11201",
        )
        self.pharmacy_in_facility = Pharmacy.objects.create(
            name="Allowed Pharmacy",
            phone_number="2125551212",
            address=self.address_in,
            is_active=True,
        )
        OrganizationPharmacyPreference.objects.create(
            organization=self.organization,
            pharmacy=self.pharmacy_in_facility,
            is_active=True,
            is_hidden=False,
        )

        # Pharmacy NOT reachable by the facility — exists at org but
        # we'll create a separate org so the patient's facility cannot
        # see it via ``get_effective_pharmacy_ids``.
        self.other_organization = Organization.objects.create(
            name="Other Org", slug="other-refill-org"
        )
        self.pharmacy_outside_facility = Pharmacy.objects.create(
            name="Forbidden Pharmacy",
            is_active=True,
        )
        OrganizationPharmacyPreference.objects.create(
            organization=self.other_organization,
            pharmacy=self.pharmacy_outside_facility,
            is_active=True,
            is_hidden=False,
        )

        # Active medication for patient A.
        self.medication_a = Medication.objects.create(
            patient=self.patient_a,
            facility=self.facility,
            status=Medication.STATUS_ACTIVE,
            medication_name="Lisinopril",
            dose="10 mg",
            route="PO",
            frequency="Daily",
        )

    def _make_clinician_user(self):
        user = User.objects.create_user(
            username="clinician_user", password="x", email="clin@example.com"
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

    def _make_inactive_portal_user(self):
        user = User.objects.create_user(
            username="portal_inactive", password="x", email="inactive@example.com"
        )
        patient = Patient.objects.create(
            facility=self.facility,
            first_name="Inactive",
            last_name="Patient",
            date_of_birth=date(1970, 3, 3),
            gender=self.facility.patient_genders.first(),
        )
        PatientPortalAccount.objects.create(user=user, patient=patient, is_active=False)
        return user


class PortalRefillCreateTests(PortalRefillBaseMixin, APITestCase):
    URL = "/v1/portal/refill-requests/"

    def test_anonymous_returns_401(self):
        response = self.client.post(
            self.URL,
            {"medication_id": self.medication_a.id, "days_supply": 30},
            format="json",
        )
        self.assertEqual(response.status_code, 401)

    def test_clinician_without_portal_account_returns_403(self):
        self.client.force_authenticate(self._make_clinician_user())
        response = self.client.post(
            self.URL,
            {"medication_id": self.medication_a.id, "days_supply": 30},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_inactive_portal_account_returns_403(self):
        self.client.force_authenticate(self._make_inactive_portal_user())
        response = self.client.post(
            self.URL,
            {"medication_id": self.medication_a.id, "days_supply": 30},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_create_refill_for_own_active_medication(self):
        self.client.force_authenticate(self.portal_user_a)
        response = self.client.post(
            self.URL,
            {
                "medication_id": self.medication_a.id,
                "patient_note": "Running low",
                "pharmacy_id": self.pharmacy_in_facility.id,
                "days_supply": 60,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        body = response.json()
        self.assertEqual(body["status"], "pending")
        self.assertEqual(body["medication_id"], self.medication_a.id)
        self.assertEqual(body["pharmacy_id"], self.pharmacy_in_facility.id)
        self.assertEqual(body["pharmacy_name"], "Allowed Pharmacy")
        self.assertEqual(body["patient_note"], "Running low")
        self.assertEqual(body["days_supply"], 60)
        # Clinician-side fields must not leak.
        for forbidden in (
            "clinician_note",
            "resolved_by",
            "resolved_by_name",
            "created_by_name",
        ):
            self.assertNotIn(forbidden, body)

    def test_create_refill_for_inactive_medication_returns_400(self):
        self.medication_a.status = Medication.STATUS_INACTIVE
        self.medication_a.save()
        self.client.force_authenticate(self.portal_user_a)
        response = self.client.post(
            self.URL,
            {"medication_id": self.medication_a.id, "days_supply": 30},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("medication_id", response.json())

    def test_create_refill_for_other_patients_medication_returns_404(self):
        # Patient B tries to refill Patient A's medication.
        self.client.force_authenticate(self.portal_user_b)
        response = self.client.post(
            self.URL,
            {"medication_id": self.medication_a.id, "days_supply": 30},
            format="json",
        )
        self.assertEqual(response.status_code, 404)

    def test_duplicate_pending_request_returns_400(self):
        RefillRequest.objects.create(
            medication=self.medication_a,
            patient=self.patient_a,
            facility=self.facility,
            status=RefillRequest.STATUS_PENDING,
        )
        self.client.force_authenticate(self.portal_user_a)
        response = self.client.post(
            self.URL,
            {"medication_id": self.medication_a.id, "days_supply": 30},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("medication_id", response.json())

    def test_cross_facility_pharmacy_returns_403(self):
        self.client.force_authenticate(self.portal_user_a)
        response = self.client.post(
            self.URL,
            {
                "medication_id": self.medication_a.id,
                "pharmacy_id": self.pharmacy_outside_facility.id,
                "days_supply": 30,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_no_pharmacy_id_snapshots_preferred_pharmacy(self):
        self.patient_a.preferred_pharmacy = self.pharmacy_in_facility
        self.patient_a.save()
        self.client.force_authenticate(self.portal_user_a)
        response = self.client.post(
            self.URL,
            {"medication_id": self.medication_a.id, "days_supply": 30},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        body = response.json()
        self.assertEqual(body["pharmacy_id"], self.pharmacy_in_facility.id)
        self.assertEqual(body["pharmacy_name"], "Allowed Pharmacy")

    def test_no_pharmacy_and_no_preferred_pharmacy_creates_with_null(self):
        self.client.force_authenticate(self.portal_user_a)
        response = self.client.post(
            self.URL,
            {"medication_id": self.medication_a.id, "days_supply": 30},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        body = response.json()
        self.assertIsNone(body["pharmacy_id"])
        self.assertEqual(body["pharmacy_name"], "")

    def test_missing_days_supply_returns_400(self):
        self.client.force_authenticate(self.portal_user_a)
        response = self.client.post(
            self.URL, {"medication_id": self.medication_a.id}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("days_supply", response.json())

    def test_unsupported_days_supply_returns_400(self):
        self.client.force_authenticate(self.portal_user_a)
        response = self.client.post(
            self.URL,
            {"medication_id": self.medication_a.id, "days_supply": 45},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("days_supply", response.json())

    def test_days_supply_is_persisted_and_returned(self):
        self.client.force_authenticate(self.portal_user_a)
        response = self.client.post(
            self.URL,
            {"medication_id": self.medication_a.id, "days_supply": 90},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.json()["days_supply"], 90)
        refill = RefillRequest.objects.get(pk=response.json()["id"])
        self.assertEqual(refill.days_supply, 90)


class PortalRefillListTests(PortalRefillBaseMixin, APITestCase):
    URL = "/v1/portal/refill-requests/"

    def test_list_returns_only_own_requests_sorted_desc(self):
        now = timezone.now()
        # Two for patient A, one for patient B.
        med_b = Medication.objects.create(
            patient=self.patient_b,
            facility=self.facility,
            status=Medication.STATUS_ACTIVE,
            medication_name="Metformin",
            dose="500 mg",
            route="PO",
            frequency="BID",
        )
        older = RefillRequest.objects.create(
            medication=self.medication_a,
            patient=self.patient_a,
            facility=self.facility,
            status=RefillRequest.STATUS_APPROVED,
            resolved_at=now,
        )
        # Force older `requested_at` via update to bypass auto_now_add.
        RefillRequest.objects.filter(pk=older.pk).update(
            requested_at=now - timedelta(days=2)
        )
        med_a2 = Medication.objects.create(
            patient=self.patient_a,
            facility=self.facility,
            status=Medication.STATUS_ACTIVE,
            medication_name="Atorvastatin",
            dose="20 mg",
            route="PO",
            frequency="QHS",
        )
        newer = RefillRequest.objects.create(
            medication=med_a2,
            patient=self.patient_a,
            facility=self.facility,
            status=RefillRequest.STATUS_PENDING,
        )
        # Patient B's row should be invisible to patient A.
        RefillRequest.objects.create(
            medication=med_b,
            patient=self.patient_b,
            facility=self.facility,
            status=RefillRequest.STATUS_PENDING,
        )

        self.client.force_authenticate(self.portal_user_a)
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 200)
        rows = response.json()
        ids = [row["id"] for row in rows]
        self.assertEqual(ids, [newer.id, older.id])

    def test_list_excludes_rows_older_than_lookback_window(self):
        old = RefillRequest.objects.create(
            medication=self.medication_a,
            patient=self.patient_a,
            facility=self.facility,
            status=RefillRequest.STATUS_APPROVED,
            resolved_at=timezone.now(),
        )
        RefillRequest.objects.filter(pk=old.pk).update(
            requested_at=timezone.now() - timedelta(days=120)
        )
        self.client.force_authenticate(self.portal_user_a)
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["id"] for row in response.json()], [])


class PortalRefillCancelTests(PortalRefillBaseMixin, APITestCase):
    def _url(self, pk):
        return f"/v1/portal/refill-requests/{pk}/cancel/"

    def test_cancel_own_pending_returns_200(self):
        refill = RefillRequest.objects.create(
            medication=self.medication_a,
            patient=self.patient_a,
            facility=self.facility,
            status=RefillRequest.STATUS_PENDING,
        )
        self.client.force_authenticate(self.portal_user_a)
        with CaptureQueriesContext(connection) as queries:
            response = self.client.post(self._url(refill.id))

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.json()["status"], "cancelled")
        self.assertTrue(
            any(
                '"medications_refillrequest"' in query["sql"]
                and "FOR UPDATE" in query["sql"].upper()
                for query in queries
            ),
            "Cancellation must lock the refill row before checking its state.",
        )
        refill.refresh_from_db()
        self.assertEqual(refill.status, RefillRequest.STATUS_CANCELLED)
        self.assertIsNone(refill.resolved_at)

    def test_cancel_other_patient_request_returns_404(self):
        refill = RefillRequest.objects.create(
            medication=self.medication_a,
            patient=self.patient_a,
            facility=self.facility,
            status=RefillRequest.STATUS_PENDING,
        )
        self.client.force_authenticate(self.portal_user_b)
        response = self.client.post(self._url(refill.id))
        self.assertEqual(response.status_code, 404)

    def test_cancel_already_resolved_returns_400(self):
        refill = RefillRequest.objects.create(
            medication=self.medication_a,
            patient=self.patient_a,
            facility=self.facility,
            status=RefillRequest.STATUS_APPROVED,
            resolved_at=timezone.now(),
        )
        self.client.force_authenticate(self.portal_user_a)
        response = self.client.post(self._url(refill.id))
        self.assertEqual(response.status_code, 400)


class PortalPharmacyListTests(PortalRefillBaseMixin, APITestCase):
    URL = "/v1/portal/pharmacies/"

    def test_lists_only_facility_allowed_active_pharmacies(self):
        # Add a third pharmacy that's allowed but inactive — must be filtered.
        inactive_allowed = Pharmacy.objects.create(
            name="Inactive Allowed",
            is_active=False,
        )
        OrganizationPharmacyPreference.objects.create(
            organization=self.organization,
            pharmacy=inactive_allowed,
            is_active=True,
            is_hidden=False,
        )

        self.client.force_authenticate(self.portal_user_a)
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 200)
        rows = response.json()
        ids = [row["id"] for row in rows]
        self.assertEqual(ids, [self.pharmacy_in_facility.id])

        # Address fields surfaced.
        row = rows[0]
        self.assertEqual(row["name"], "Allowed Pharmacy")
        self.assertEqual(row["address_line"], "100 Main St Suite 1")
        self.assertEqual(row["city"], "Brooklyn")
        self.assertEqual(row["state"], "NY")
        self.assertEqual(row["zip"], "11201")
        self.assertEqual(row["phone_number"], "2125551212")


class PortalPreferredPharmacyUpdateTests(PortalRefillBaseMixin, APITestCase):
    URL = "/v1/portal/me/preferred-pharmacy/"

    def test_set_valid_pharmacy_updates_patient_and_creates_default_row(self):
        self.client.force_authenticate(self.portal_user_a)
        response = self.client.patch(
            self.URL,
            {"pharmacy_id": self.pharmacy_in_facility.id},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        body = response.json()
        self.assertEqual(body["pharmacy_id"], self.pharmacy_in_facility.id)
        self.assertEqual(body["pharmacy_name"], "Allowed Pharmacy")

        self.patient_a.refresh_from_db()
        self.assertEqual(
            self.patient_a.preferred_pharmacy_id, self.pharmacy_in_facility.id
        )
        default_rows = PatientPharmacy.objects.filter(
            patient=self.patient_a,
            pharmacy=self.pharmacy_in_facility,
            is_default=True,
            is_active=True,
        )
        self.assertEqual(default_rows.count(), 1)

    def test_set_cross_facility_pharmacy_returns_403(self):
        self.client.force_authenticate(self.portal_user_a)
        response = self.client.patch(
            self.URL,
            {"pharmacy_id": self.pharmacy_outside_facility.id},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_clear_preferred_pharmacy_resets_state(self):
        # Seed an existing default first.
        PatientPharmacy.objects.create(
            patient=self.patient_a,
            pharmacy=self.pharmacy_in_facility,
            is_default=True,
            is_active=True,
        )
        self.patient_a.refresh_from_db()
        self.assertEqual(
            self.patient_a.preferred_pharmacy_id, self.pharmacy_in_facility.id
        )

        self.client.force_authenticate(self.portal_user_a)
        response = self.client.patch(self.URL, {"pharmacy_id": None}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIsNone(response.json()["pharmacy_id"])
        self.assertEqual(response.json()["pharmacy_name"], "")

        self.patient_a.refresh_from_db()
        self.assertIsNone(self.patient_a.preferred_pharmacy_id)
        active_defaults = PatientPharmacy.objects.filter(
            patient=self.patient_a, is_default=True, is_active=True
        )
        self.assertFalse(active_defaults.exists())
