from datetime import date

from django.core.management.base import BaseCommand, CommandError

from facilities.models import Facility, PatientGender
from patients.document_storage import get_patient_document_storage
from patients.models import (
    Patient,
    PatientDocument,
    PatientPhone,
    ensure_default_document_categories,
)
from patients.sample_documents import (
    SAMPLE_DOCUMENTS,
    get_sample_document_by_name,
    save_sample_pdf,
)


class Command(BaseCommand):
    help = "Seed sample patient documents for local document workflow testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--patient-id",
            type=int,
            help="Attach documents to a specific patient id.",
        )
        parser.add_argument(
            "--refresh-existing",
            action="store_true",
            help="Replace existing seeded document rows with local previewable PDFs.",
        )
        parser.add_argument(
            "--patients-per-facility",
            type=int,
            default=3,
            help=(
                "When --patient-id is omitted, seed documents for this many "
                "active patients per facility."
            ),
        )

    def handle(self, *args, **options):
        today = date.today()
        storage = get_patient_document_storage()

        if options.get("refresh_existing"):
            return self._refresh_existing_documents(storage, today)

        patients = self._resolve_patients(
            options.get("patient_id"),
            options.get("patients_per_facility"),
        )
        seeded = []

        for patient in patients:
            ensure_default_document_categories(patient.facility)
            created_count = 0
            for document in SAMPLE_DOCUMENTS:
                storage_key, defaults = save_sample_pdf(
                    storage,
                    patient,
                    document,
                    today=today,
                )
                _, created = PatientDocument.objects.update_or_create(
                    patient=patient,
                    name=document["name"],
                    defaults={
                        **defaults,
                        "storage_key": storage_key,
                        "file_url": "",
                    },
                )
                created_count += int(created)
            seeded.append((patient, created_count))

        for patient, created_count in seeded:
            self.stdout.write(
                self.style.SUCCESS(
                    "Seeded sample documents for "
                    f"{patient.first_name} {patient.last_name} "
                    f"(id={patient.id}, chart={patient.chart_number}, "
                    f"facility={patient.facility_id}). "
                    f"{patient.patient_documents.count()} documents attached, "
                    f"{created_count} newly created."
                )
            )

    def _resolve_patients(self, patient_id, patients_per_facility):
        if patient_id:
            try:
                return [Patient.objects.get(pk=patient_id)]
            except Patient.DoesNotExist as exc:
                raise CommandError(f"Patient {patient_id} does not exist.") from exc

        facilities = list(Facility.objects.order_by("id"))
        if not facilities:
            raise CommandError("No facility found. Run seed_demo first.")

        patients_per_facility = max(1, int(patients_per_facility or 1))
        patients = []
        for facility in facilities:
            facility_patients = list(
                Patient.objects.filter(
                    facility=facility,
                    is_active=True,
                ).order_by(
                    "last_name", "first_name", "id"
                )[:patients_per_facility]
            )
            if not facility_patients:
                facility_patients = [self._get_or_create_document_patient(facility)]
            patients.extend(facility_patients)
        return patients

    def _get_or_create_document_patient(self, facility):
        gender = PatientGender.objects.filter(facility=facility).order_by("id").first()
        if not gender:
            raise CommandError(
                f"No patient gender found for facility {facility.id}. Run seed_demo first."
            )

        patient, _ = Patient.objects.get_or_create(
            facility=facility,
            first_name="Document",
            last_name="Demo",
            date_of_birth=date(1985, 1, 15),
            defaults={
                "gender": gender,
                "preferred_name": "Document",
                "email": "document.demo@demo-patient.local",
                "is_active": True,
            },
        )
        PatientPhone.objects.get_or_create(
            patient=patient,
            number="555-010-2400",
            defaults={"label": "cell", "is_primary": True},
        )
        return patient

    def _refresh_existing_documents(self, storage, today):
        sample_names = [document["name"] for document in SAMPLE_DOCUMENTS]
        documents = PatientDocument.objects.filter(
            name__in=sample_names,
            is_active=True,
        ).select_related("patient", "patient__facility")

        refreshed_count = 0
        for patient_document in documents:
            sample_document = get_sample_document_by_name(patient_document.name)
            if not sample_document:
                continue

            ensure_default_document_categories(patient_document.patient.facility)
            storage_key, defaults = save_sample_pdf(
                storage,
                patient_document.patient,
                sample_document,
                today=today,
            )
            for field, value in defaults.items():
                setattr(patient_document, field, value)
            patient_document.storage_key = storage_key
            patient_document.file_url = ""
            patient_document.save()
            refreshed_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Refreshed {refreshed_count} existing sample documents as local PDFs."
            )
        )
