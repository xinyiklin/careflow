"""Tests for the clinical Vitals model."""

from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from clinical.models import Encounter, ProgressNote, Vitals
from facilities.models import Facility
from organizations.models import Organization
from patients.models import Patient

User = get_user_model()


class VitalsModelTests(TestCase):
    def setUp(self):
        self.organization = Organization.objects.create(
            name="Vitals Test Org", slug="vitals-org"
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Vitals Clinic",
            timezone="America/Los_Angeles",
        )
        self.gender = self.facility.patient_genders.first()
        self.patient = Patient.objects.create(
            facility=self.facility,
            first_name="Vital",
            last_name="Patient",
            date_of_birth=date(1985, 6, 1),
            gender=self.gender,
        )
        self.encounter = Encounter.objects.create(
            patient=self.patient,
            facility=self.facility,
            reason="Annual physical",
            started_at=timezone.now(),
        )
        self.user = User.objects.create_user(username="ma", password="x")

    def test_create_vitals_with_valid_data(self):
        vitals = Vitals.objects.create(
            encounter=self.encounter,
            height_cm=Decimal("175.0"),
            weight_kg=Decimal("70.5"),
            bp_systolic=120,
            bp_diastolic=80,
            heart_rate_bpm=72,
            respiratory_rate=16,
            temperature_c=Decimal("36.8"),
            spo2_percent=98,
            pain_score=2,
            recorded_by=self.user,
        )
        self.assertEqual(vitals.bp_systolic, 120)
        self.assertEqual(vitals.recorded_by_name, "ma")

    def test_bmi_property_computes_from_height_weight(self):
        vitals = Vitals.objects.create(
            encounter=self.encounter,
            height_cm=Decimal("180.0"),
            weight_kg=Decimal("80.0"),
        )
        # 80 / (1.8 * 1.8) = 24.69... → rounds to 24.7
        self.assertEqual(vitals.bmi, Decimal("24.7"))

    def test_bmi_is_none_without_both_height_and_weight(self):
        vitals_no_height = Vitals.objects.create(
            encounter=self.encounter, weight_kg=Decimal("70.0")
        )
        self.assertIsNone(vitals_no_height.bmi)

    def test_rejects_diastolic_at_or_above_systolic(self):
        with self.assertRaises(ValidationError) as ctx:
            Vitals.objects.create(
                encounter=self.encounter,
                bp_systolic=120,
                bp_diastolic=120,
            )
        self.assertIn("bp_diastolic", ctx.exception.message_dict)

    def test_rejects_measured_before_encounter_start(self):
        before_start = self.encounter.started_at - timedelta(hours=1)
        with self.assertRaises(ValidationError) as ctx:
            Vitals.objects.create(
                encounter=self.encounter,
                measured_at=before_start,
                bp_systolic=120,
                bp_diastolic=80,
            )
        self.assertIn("measured_at", ctx.exception.message_dict)

    def test_locked_after_encounter_signed(self):
        vitals = Vitals.objects.create(
            encounter=self.encounter,
            bp_systolic=120,
            bp_diastolic=80,
        )
        # Sign the encounter via the progress note workflow
        note = ProgressNote.objects.create(encounter=self.encounter)
        note.sign(self.user)

        vitals.refresh_from_db()
        vitals.bp_systolic = 130
        with self.assertRaises(ValidationError) as ctx:
            vitals.save()
        self.assertIn("encounter", ctx.exception.message_dict)

    def test_validator_rejects_out_of_range_temperature(self):
        with self.assertRaises(ValidationError) as ctx:
            Vitals.objects.create(
                encounter=self.encounter, temperature_c=Decimal("50.0")
            )
        self.assertIn("temperature_c", ctx.exception.message_dict)
