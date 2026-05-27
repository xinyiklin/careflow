"""Tests for the patient-portal medical summary endpoint."""

from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from allergies.models import PatientAllergy
from clinical.models import Encounter, ProgressNote, Vitals
from facilities.models import Facility
from medications.models import Medication
from organizations.models import Organization
from patients.models import Patient
from users.portal import PatientPortalAccount

User = get_user_model()


class PortalMedicalSummaryViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.organization = Organization.objects.create(
            name="Summary Org", slug="summary-org"
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Summary Clinic",
            timezone="America/Los_Angeles",
        )
        self.gender = self.facility.patient_genders.first()
        self.patient = Patient.objects.create(
            facility=self.facility,
            first_name="Sam",
            last_name="Summary",
            date_of_birth=date(1985, 1, 1),
            gender=self.gender,
        )
        self.other_patient = Patient.objects.create(
            facility=self.facility,
            first_name="Other",
            last_name="Patient",
            date_of_birth=date(1980, 2, 2),
            gender=self.gender,
        )
        self.portal_user = User.objects.create_user(
            username="portal_sam", password="x", email="portal_sam@example.com"
        )
        PatientPortalAccount.objects.create(user=self.portal_user, patient=self.patient)
        self.clinician = User.objects.create_user(
            username="dr_x", password="x", email="dr_x@example.com"
        )

    def _make_signed_encounter(self, patient, reason="Annual physical"):
        enc = Encounter.objects.create(
            patient=patient,
            facility=self.facility,
            reason=reason,
            started_at=timezone.now(),
        )
        note = ProgressNote.objects.create(
            encounter=enc,
            subjective="Feels well",
            objective="Vitals stable",
            assessment="Healthy adult",
            plan="Routine follow-up",
        )
        note.sign(self.clinician)
        return enc

    def test_anonymous_request_returns_401(self):
        response = self.client.get("/v1/portal/medical-summary/")
        self.assertEqual(response.status_code, 401)

    def test_returns_signed_visits_only(self):
        signed_enc = self._make_signed_encounter(self.patient, reason="Signed visit")
        # An in-progress encounter should NOT be returned
        Encounter.objects.create(
            patient=self.patient,
            facility=self.facility,
            reason="Open visit",
            started_at=timezone.now(),
        )

        self.client.force_authenticate(self.portal_user)
        response = self.client.get("/v1/portal/medical-summary/")

        self.assertEqual(response.status_code, 200)
        visits = response.data["visits"]
        self.assertEqual(len(visits), 1)
        self.assertEqual(visits[0]["id"], signed_enc.id)
        self.assertEqual(visits[0]["reason"], "Signed visit")
        self.assertIsNotNone(visits[0]["progress_note"])
        self.assertEqual(visits[0]["progress_note"]["assessment"], "Healthy adult")

    def test_excludes_other_patients_visits(self):
        self._make_signed_encounter(self.patient, reason="Mine")
        self._make_signed_encounter(self.other_patient, reason="Not mine")

        self.client.force_authenticate(self.portal_user)
        response = self.client.get("/v1/portal/medical-summary/")
        reasons = [visit["reason"] for visit in response.data["visits"]]
        self.assertEqual(reasons, ["Mine"])

    def test_returns_vitals_when_present(self):
        enc = self._make_signed_encounter(self.patient)
        # Vitals must be created BEFORE the encounter is signed (lock guard)
        # The helper signs the encounter, so we re-sign manually below.
        Encounter.objects.filter(pk=enc.pk).update(status=Encounter.STATUS_IN_PROGRESS)
        enc.refresh_from_db()
        Vitals.objects.create(
            encounter=enc,
            height_cm=Decimal("170.0"),
            weight_kg=Decimal("65.0"),
            bp_systolic=118,
            bp_diastolic=76,
        )
        # Re-sign
        note = enc.progress_note
        Encounter.objects.filter(pk=enc.pk).update(status=Encounter.STATUS_SIGNED)

        self.client.force_authenticate(self.portal_user)
        response = self.client.get("/v1/portal/medical-summary/")

        vitals = response.data["visits"][0]["vitals"]
        self.assertIsNotNone(vitals)
        self.assertEqual(vitals["bp_systolic"], 118)
        self.assertEqual(vitals["bmi"], "22.5")
        self.assertEqual(note.status, "signed")

    def test_includes_active_medications_and_allergies(self):
        Medication.objects.create(
            patient=self.patient,
            facility=self.facility,
            status=Medication.STATUS_ACTIVE,
            medication_name="Lisinopril",
            dose="10 mg",
            route="PO",
            frequency="QD",
        )
        Medication.objects.create(
            patient=self.patient,
            facility=self.facility,
            status=Medication.STATUS_DISCONTINUED,
            medication_name="Discontinued med",
            dose="5 mg",
            route="PO",
            frequency="BID",
        )
        PatientAllergy.objects.create(
            patient=self.patient,
            facility=self.facility,
            allergen="Penicillin",
            category=PatientAllergy.CATEGORY_MEDICATION,
            reaction="Hives",
            severity=PatientAllergy.SEVERITY_MODERATE,
            status=PatientAllergy.STATUS_ACTIVE,
        )

        self.client.force_authenticate(self.portal_user)
        response = self.client.get("/v1/portal/medical-summary/")

        med_names = [m["medication_name"] for m in response.data["active_medications"]]
        self.assertEqual(med_names, ["Lisinopril"])

        allergens = [a["allergen"] for a in response.data["active_allergies"]]
        self.assertEqual(allergens, ["Penicillin"])
