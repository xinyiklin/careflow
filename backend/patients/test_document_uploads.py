from datetime import date
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from pypdf import PdfReader, PdfWriter

from audit.models import AuditEvent
from facilities.models import Facility

from . import tests as patient_tests
from .models import Patient, PatientDocument


class PatientDocumentUploadTests(TestCase):
    def setUp(self):
        patient_tests.PatientViewSetTests.setUp(self)
        temporary_storage = TemporaryDirectory()
        self.addCleanup(temporary_storage.cleanup)
        self.storage_root = Path(temporary_storage.name)
        storage_settings = override_settings(
            PATIENT_DOCUMENT_STORAGE_BACKEND="local",
            PATIENT_DOCUMENT_LOCAL_ROOT=temporary_storage.name,
        )
        storage_settings.enable()
        self.addCleanup(storage_settings.disable)

    def upload(self, patient_id, *, field="patient", name="scan.png", mime="image/png"):
        content = BytesIO()
        Image.new("RGB", (4, 4), "white").save(content, format="PNG")
        return self.client.post(
            "/v1/patients/documents/",
            {
                field: patient_id,
                "file": SimpleUploadedFile(name, content.getvalue(), mime),
            },
            format="multipart",
        )

    def assert_nothing_stored(self):
        self.assertFalse(PatientDocument.objects.exists())
        self.assertEqual(list(self.storage_root.iterdir()), [])
        self.assertFalse(
            AuditEvent.objects.filter(model_name="patientdocument").exists()
        )

    def test_malformed_patient_id_aliases_return_400_before_storage(self):
        for field in ("patient", "patient_id"):
            for value in ("not-an-integer", "1.5"):
                with self.subTest(field=field, value=value):
                    response = self.upload(value, field=field)
                    self.assertEqual(response.status_code, 400)
                    self.assertIn("patient", response.data)
                    self.assert_nothing_stored()

    def test_mislabeled_supported_file_returns_400_before_storage(self):
        response = self.upload(self.patient.pk, name="scan.pdf", mime="application/pdf")
        self.assertEqual(response.status_code, 400)
        self.assertIn("file", response.data)
        self.assert_nothing_stored()

    def test_valid_formats_upload_and_bundle_with_all_bytes_preserved(self):
        pdf = BytesIO()
        writer = PdfWriter()
        writer.add_blank_page(width=72, height=72)
        writer.write(pdf)
        files = [("scan.pdf", "application/pdf", pdf.getvalue())]
        for extension, image_format, mime in (
            ("png", "PNG", "image/png"),
            ("jpg", "JPEG", "image/jpeg"),
            ("jpeg", "JPEG", "image/jpeg"),
            ("tif", "TIFF", "image/tiff"),
            ("tiff", "TIFF", "image/tiff"),
        ):
            content = BytesIO()
            Image.new("RGB", (4, 4), "white").save(content, format=image_format)
            files.append((f"scan.{extension}", mime, content.getvalue()))

        document_ids = []
        for index, (filename, mime, content) in enumerate(files):
            with self.subTest(filename=filename):
                field = "patient" if index % 2 == 0 else "patient_id"
                response = self.client.post(
                    "/v1/patients/documents/",
                    {
                        field: str(self.patient.pk),
                        "file": SimpleUploadedFile(filename, content, mime),
                    },
                    format="multipart",
                )
                self.assertEqual(response.status_code, 201)
                document = PatientDocument.objects.get(pk=response.data["id"])
                self.assertEqual(document.patient_id, self.patient.pk)
                self.assertEqual(document.content_type, mime)
                self.assertEqual(
                    (self.storage_root / document.storage_key).read_bytes(), content
                )
                document_ids.append(document.pk)
        response = self.client.post(
            "/v1/patients/documents/bundle/view/",
            {"document_ids": document_ids},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        bundled = b"".join(response.streaming_content)
        response.close()
        self.assertEqual(len(PdfReader(BytesIO(bundled)).pages), len(files))

    def test_unavailable_and_cross_facility_patient_ids_remain_denied(self):
        other_facility = Facility.objects.create(
            organization=self.organization, name="Other synthetic clinic"
        )
        other_patient = Patient.objects.create(
            facility=other_facility,
            first_name="Other",
            last_name="Synthetic",
            date_of_birth=date(1990, 1, 1),
            gender=other_facility.patient_genders.first(),
        )
        self.patient.is_active = False
        self.patient.save(update_fields=["is_active"])
        for patient_id in (other_patient.pk, self.patient.pk, other_patient.pk + 100):
            with self.subTest(patient_id=patient_id):
                self.assertEqual(self.upload(patient_id).status_code, 403)
                self.assert_nothing_stored()

    def test_unauthenticated_upload_remains_denied(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.upload(self.patient.pk).status_code, 401)
        self.assert_nothing_stored()

    def test_upload_without_manage_permission_remains_denied(self):
        self.staff.security_overrides = {"documents.manage": False}
        self.staff.save(update_fields=["security_overrides"])
        self.assertEqual(self.upload(self.patient.pk).status_code, 403)
        self.assert_nothing_stored()
