from io import BytesIO
from itertools import product

from django.core.exceptions import ImproperlyConfigured, SuspiciousFileOperation
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, override_settings

from .document_pdf import DocumentPdfError, validate_supported_document_file
from .document_storage import R2PatientDocumentStorage, get_patient_document_storage


class FakeR2Client:
    def __init__(self):
        self.objects = {}
        self.put_calls = []

    def put_object(self, **params):
        self.put_calls.append(params)
        self.objects[(params["Bucket"], params["Key"])] = params["Body"]

    def get_object(self, Bucket, Key):
        return {"Body": BytesIO(self.objects[(Bucket, Key)])}

    def head_object(self, Bucket, Key):
        if (Bucket, Key) not in self.objects:
            raise FakeR2NotFound()
        return {}


class FakeR2NotFound(Exception):
    response = {"Error": {"Code": "404"}}


class R2PatientDocumentStorageTests(SimpleTestCase):
    def test_save_upload_stores_object_with_content_type(self):
        client = FakeR2Client()
        storage = R2PatientDocumentStorage(
            bucket="documents",
            endpoint_url="https://example.r2.cloudflarestorage.com",
            access_key_id="access-key",
            secret_access_key="secret-key",
            client=client,
        )
        uploaded_file = SimpleUploadedFile(
            "Clinical Note.PDF",
            b"%PDF-1.4",
            content_type="application/pdf",
        )

        key = storage.save(uploaded_file, patient_id=42)

        self.assertRegex(key, r"^patients/42/[a-f0-9]{32}\.pdf$")
        self.assertTrue(storage.exists(key))
        self.assertEqual(storage.open(key).read(), b"%PDF-1.4")
        self.assertEqual(client.put_calls[0]["Bucket"], "documents")
        self.assertEqual(client.put_calls[0]["ContentType"], "application/pdf")

    def test_save_bytes_uses_binary_suffix_when_filename_has_none(self):
        client = FakeR2Client()
        storage = R2PatientDocumentStorage(
            bucket="documents",
            endpoint_url="https://example.r2.cloudflarestorage.com",
            access_key_id="access-key",
            secret_access_key="secret-key",
            client=client,
        )

        key = storage.save_bytes(b"content", patient_id=7, filename="")

        self.assertRegex(key, r"^patients/7/[a-f0-9]{32}\.bin$")
        self.assertEqual(storage.open(key).read(), b"content")

    def test_exists_returns_false_when_object_is_missing(self):
        storage = R2PatientDocumentStorage(
            bucket="documents",
            endpoint_url="https://example.r2.cloudflarestorage.com",
            access_key_id="access-key",
            secret_access_key="secret-key",
            client=FakeR2Client(),
        )

        self.assertFalse(storage.exists("patients/7/missing.pdf"))

    def test_rejects_unsafe_storage_keys(self):
        storage = R2PatientDocumentStorage(
            bucket="documents",
            endpoint_url="https://example.r2.cloudflarestorage.com",
            access_key_id="access-key",
            secret_access_key="secret-key",
            client=FakeR2Client(),
        )

        with self.assertRaises(SuspiciousFileOperation):
            storage.exists("../private.pdf")

    @override_settings(
        PATIENT_DOCUMENT_STORAGE_BACKEND="r2",
        PATIENT_DOCUMENT_R2_BUCKET="",
        PATIENT_DOCUMENT_R2_ENDPOINT_URL="",
        PATIENT_DOCUMENT_R2_ACCOUNT_ID="",
        PATIENT_DOCUMENT_R2_ACCESS_KEY_ID="",
        PATIENT_DOCUMENT_R2_SECRET_ACCESS_KEY="",
    )
    def test_factory_requires_r2_configuration(self):
        with self.assertRaises(ImproperlyConfigured):
            get_patient_document_storage()


class ValidateSupportedDocumentFileTests(SimpleTestCase):
    def test_supported_format_declarations_must_agree(self):
        formats = (
            ("application/pdf", ".pdf", b"%PDF-1.4"),
            ("image/jpeg", ".jpg", b"\xff\xd8\xff"),
            ("image/png", ".png", b"\x89PNG\r\n\x1a\n"),
            ("image/tiff", ".tif", b"II*\x00"),
        )
        for mime_format, extension_format, content_format in product(formats, repeat=3):
            mime, extension, content = (
                mime_format[0],
                extension_format[1],
                content_format[2],
            )
            with self.subTest(mime=mime, extension=extension, actual=content_format[0]):
                upload = SimpleUploadedFile(f"scan{extension}", content, mime)
                if mime_format == extension_format == content_format:
                    validate_supported_document_file(upload)
                    self.assertEqual(upload.read(), content)
                else:
                    with self.assertRaises(DocumentPdfError):
                        validate_supported_document_file(upload)

    def test_format_aliases_and_case_preserve_validation_and_rewind(self):
        for mime, extension, content in (
            ("image/jpeg", ".jpeg", b"\xff\xd8\xff"),
            ("image/tiff", ".tiff", b"II*\x00"),
            ("image/tiff", ".tif", b"MM\x00*"),
            ("image/tiff", ".tiff", b"MM\x00*"),
            ("application/pdf", ".pdf", b"%PDF-1.4"),
        ):
            with self.subTest(mime=mime, extension=extension):
                upload = SimpleUploadedFile(
                    f"SCAN{extension.upper()}", content, mime.upper()
                )
                validate_supported_document_file(upload)
                self.assertEqual(upload.read(), content)

    @override_settings(PATIENT_DOCUMENT_MAX_UPLOAD_BYTES=8)
    def test_upload_size_limit_is_preserved(self):
        upload = SimpleUploadedFile("scan.pdf", b"%PDF-1.4\n", "application/pdf")
        with self.assertRaisesMessage(DocumentPdfError, "or smaller"):
            validate_supported_document_file(upload)

    def test_accepts_real_pdf_and_rewinds_for_storage(self):
        upload = SimpleUploadedFile(
            "scan.pdf",
            b"%PDF-1.4\n%real pdf bytes\n",
            content_type="application/pdf",
        )
        validate_supported_document_file(upload)
        # The magic-byte sniff must rewind so storage still saves the whole file.
        self.assertTrue(upload.read().startswith(b"%PDF-"))

    def test_rejects_spoofed_pdf_with_wrong_magic_bytes(self):
        upload = SimpleUploadedFile(
            "evil.pdf",
            b"<html><body>not a pdf</body></html>",
            content_type="application/pdf",
        )
        with self.assertRaises(DocumentPdfError):
            validate_supported_document_file(upload)

    def test_accepts_real_png(self):
        upload = SimpleUploadedFile(
            "image.png",
            b"\x89PNG\r\n\x1a\n" + b"\x00" * 16,
            content_type="image/png",
        )
        validate_supported_document_file(upload)
