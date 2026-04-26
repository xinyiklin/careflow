from io import BytesIO
from pathlib import Path, PurePosixPath
from uuid import uuid4

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured, SuspiciousFileOperation


def build_document_storage_key(patient_id, filename, default_suffix=""):
    suffix = Path(filename or "").suffix.lower() or default_suffix
    return f"patients/{patient_id}/{uuid4().hex}{suffix}"


class LocalPatientDocumentStorage:
    def __init__(self, root=None):
        self.root = Path(root or settings.PATIENT_DOCUMENT_LOCAL_ROOT)

    def save(self, uploaded_file, patient_id):
        key = build_document_storage_key(patient_id, uploaded_file.name)
        destination = self._resolve(key)
        destination.parent.mkdir(parents=True, exist_ok=True)

        with destination.open("wb") as output:
            for chunk in uploaded_file.chunks():
                output.write(chunk)

        return key

    def save_bytes(self, content, patient_id, filename):
        key = build_document_storage_key(patient_id, filename, default_suffix=".bin")
        destination = self._resolve(key)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(content)
        return key

    def open(self, key):
        return self._resolve(key).open("rb")

    def exists(self, key):
        return self._resolve(key).exists()

    def _resolve(self, key):
        root = self.root.resolve()
        path = (root / key).resolve()
        if root != path and root not in path.parents:
            raise SuspiciousFileOperation("Invalid document storage key.")
        return path


class R2PatientDocumentStorage:
    def __init__(
        self,
        bucket=None,
        endpoint_url=None,
        access_key_id=None,
        secret_access_key=None,
        region_name=None,
        client=None,
    ):
        self.bucket = bucket or settings.PATIENT_DOCUMENT_R2_BUCKET
        self.endpoint_url = (
            endpoint_url
            or settings.PATIENT_DOCUMENT_R2_ENDPOINT_URL
            or self._default_endpoint_url()
        )
        self.access_key_id = access_key_id or settings.PATIENT_DOCUMENT_R2_ACCESS_KEY_ID
        self.secret_access_key = (
            secret_access_key or settings.PATIENT_DOCUMENT_R2_SECRET_ACCESS_KEY
        )
        self.region_name = region_name or settings.PATIENT_DOCUMENT_R2_REGION
        self.client = client or self._build_client()

    def save(self, uploaded_file, patient_id):
        key = build_document_storage_key(patient_id, uploaded_file.name)
        self._put_object(
            key,
            b"".join(uploaded_file.chunks()),
            content_type=getattr(uploaded_file, "content_type", None),
        )
        return key

    def save_bytes(self, content, patient_id, filename):
        key = build_document_storage_key(patient_id, filename, default_suffix=".bin")
        self._put_object(key, content)
        return key

    def open(self, key):
        self._validate_key(key)
        response = self.client.get_object(Bucket=self.bucket, Key=key)
        body = response["Body"]
        try:
            return BytesIO(body.read())
        finally:
            close = getattr(body, "close", None)
            if close:
                close()

    def exists(self, key):
        self._validate_key(key)
        try:
            self.client.head_object(Bucket=self.bucket, Key=key)
        except Exception as exc:
            if self._is_not_found(exc):
                return False
            raise
        return True

    def _put_object(self, key, content, content_type=None):
        self._validate_key(key)
        params = {
            "Bucket": self.bucket,
            "Key": key,
            "Body": content,
        }
        if content_type:
            params["ContentType"] = content_type
        self.client.put_object(**params)

    def _build_client(self):
        missing = [
            name
            for name, value in {
                "CLOUDFLARE_R2_BUCKET": self.bucket,
                "CLOUDFLARE_R2_ENDPOINT_URL or CLOUDFLARE_R2_ACCOUNT_ID": (
                    self.endpoint_url
                ),
                "CLOUDFLARE_R2_ACCESS_KEY_ID": self.access_key_id,
                "CLOUDFLARE_R2_SECRET_ACCESS_KEY": self.secret_access_key,
            }.items()
            if not value
        ]
        if missing:
            raise ImproperlyConfigured(
                "Missing Cloudflare R2 document storage setting(s): "
                + ", ".join(missing)
            )

        try:
            import boto3
        except ImportError as exc:
            raise ImproperlyConfigured(
                "Install boto3 to use Cloudflare R2 document storage."
            ) from exc

        return boto3.client(
            service_name="s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            region_name=self.region_name,
        )

    def _default_endpoint_url(self):
        account_id = settings.PATIENT_DOCUMENT_R2_ACCOUNT_ID
        if not account_id:
            return ""
        return f"https://{account_id}.r2.cloudflarestorage.com"

    def _validate_key(self, key):
        path = PurePosixPath(key)
        if not key or path.is_absolute() or ".." in path.parts:
            raise SuspiciousFileOperation("Invalid document storage key.")

    def _is_not_found(self, exc):
        error = getattr(exc, "response", {}).get("Error", {})
        code = str(error.get("Code", "")).lower()
        return code in {"404", "notfound", "nosuchkey"}


def get_patient_document_storage():
    storage_backend = settings.PATIENT_DOCUMENT_STORAGE_BACKEND.lower()
    if storage_backend == "local":
        return LocalPatientDocumentStorage()
    if storage_backend == "r2":
        return R2PatientDocumentStorage()
    raise ImproperlyConfigured(
        "Unsupported patient document storage backend: "
        f"{settings.PATIENT_DOCUMENT_STORAGE_BACKEND}"
    )
