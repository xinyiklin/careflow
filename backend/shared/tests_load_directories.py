"""Tests for the ``load_directories`` management command."""

from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from insurance.carrier_directory import CARRIER_DIRECTORY
from insurance.models import InsuranceCarrier
from patients.models import Pharmacy
from patients.pharmacy_directory import PHARMACY_DIRECTORY


class LoadDirectoriesCommandTests(TestCase):
    def _call(self, **kwargs):
        out = StringIO()
        call_command("load_directories", stdout=out, **kwargs)
        return out.getvalue()

    def test_seeds_pharmacies_and_carriers(self):
        output = self._call()
        self.assertEqual(Pharmacy.objects.count(), len(PHARMACY_DIRECTORY))
        self.assertEqual(InsuranceCarrier.objects.count(), len(CARRIER_DIRECTORY))
        self.assertIn("Pharmacies:", output)
        self.assertIn("Insurance carriers:", output)

    def test_rerun_is_idempotent(self):
        self._call()
        self._call()
        self.assertEqual(Pharmacy.objects.count(), len(PHARMACY_DIRECTORY))
        self.assertEqual(InsuranceCarrier.objects.count(), len(CARRIER_DIRECTORY))

    def test_directory_pharmacies_carry_directory_source_flag(self):
        self._call()
        directory_count = Pharmacy.objects.filter(
            source=Pharmacy.SOURCE_DIRECTORY
        ).count()
        self.assertEqual(directory_count, len(PHARMACY_DIRECTORY))
        sample = Pharmacy.objects.get(external_id="directory:cvs-retail")
        self.assertEqual(sample.name, "CVS Pharmacy")
        self.assertEqual(sample.directory_status, Pharmacy.DIRECTORY_STATUS_ACTIVE)

    def test_carriers_only_skips_pharmacies(self):
        self._call(carriers_only=True)
        self.assertEqual(Pharmacy.objects.count(), 0)
        self.assertEqual(InsuranceCarrier.objects.count(), len(CARRIER_DIRECTORY))

    def test_pharmacies_only_skips_carriers(self):
        self._call(pharmacies_only=True)
        self.assertEqual(Pharmacy.objects.count(), len(PHARMACY_DIRECTORY))
        self.assertEqual(InsuranceCarrier.objects.count(), 0)
