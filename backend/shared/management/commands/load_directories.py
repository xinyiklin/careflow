"""Idempotently seed the app-scale pharmacy and insurance carrier directories.

Run with ``./venv/bin/python manage.py load_directories``. Safe to re-run;
uses each entry's natural key (``Pharmacy.external_id`` for pharmacies,
``InsuranceCarrier.payer_id`` for carriers) to update existing rows in
place rather than create duplicates.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from insurance.carrier_directory import CARRIER_DIRECTORY
from insurance.models import InsuranceCarrier
from patients.models import Pharmacy
from patients.pharmacy_directory import PHARMACY_DIRECTORY


class Command(BaseCommand):
    help = "Seed/refresh the global pharmacy and insurance-carrier directories."

    def add_arguments(self, parser):
        parser.add_argument(
            "--pharmacies-only",
            action="store_true",
            help="Skip insurance carriers; only refresh pharmacies.",
        )
        parser.add_argument(
            "--carriers-only",
            action="store_true",
            help="Skip pharmacies; only refresh insurance carriers.",
        )

    def handle(self, *args, **options):
        pharmacies_only = options["pharmacies_only"]
        carriers_only = options["carriers_only"]

        if not carriers_only:
            self._load_pharmacies()
        if not pharmacies_only:
            self._load_carriers()

    @transaction.atomic
    def _load_pharmacies(self):
        created = 0
        updated = 0
        for external_id, name, service_type, phone, website in PHARMACY_DIRECTORY:
            obj, was_created = Pharmacy.objects.update_or_create(
                external_id=external_id,
                defaults={
                    "name": name,
                    "source": Pharmacy.SOURCE_DIRECTORY,
                    "service_type": service_type,
                    "phone_number": phone,
                    "directory_source": "careflow-seed",
                    "directory_status": Pharmacy.DIRECTORY_STATUS_ACTIVE,
                    "is_active": True,
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1
        self.stdout.write(
            self.style.SUCCESS(
                f"Pharmacies: {created} created, {updated} updated "
                f"({len(PHARMACY_DIRECTORY)} total in directory)."
            )
        )

    @transaction.atomic
    def _load_carriers(self):
        created = 0
        updated = 0
        for name, payer_id, phone, website in CARRIER_DIRECTORY:
            obj, was_created = InsuranceCarrier.objects.update_or_create(
                payer_id=payer_id,
                defaults={
                    "name": name,
                    "phone_number": phone,
                    "website": website,
                    "is_active": True,
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1
        self.stdout.write(
            self.style.SUCCESS(
                f"Insurance carriers: {created} created, {updated} updated "
                f"({len(CARRIER_DIRECTORY)} total in directory)."
            )
        )
