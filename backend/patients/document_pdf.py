from io import BytesIO

from django.conf import settings
from PIL import Image, ImageOps, UnidentifiedImageError
from pypdf import PdfReader, PdfWriter
from pypdf.errors import PdfReadError

# Bundling chooses a parser from the stored MIME type, so the extension and
# leading bytes must identify that same format at upload time.
SUPPORTED_DOCUMENT_FORMATS = {
    "application/pdf": ((".pdf",), (b"%PDF-",)),
    "image/jpeg": ((".jpg", ".jpeg"), (b"\xff\xd8\xff",)),
    "image/png": ((".png",), (b"\x89PNG\r\n\x1a\n",)),
    "image/tiff": ((".tif", ".tiff"), (b"II*\x00", b"MM\x00*")),
}


class DocumentPdfError(ValueError):
    pass


def validate_supported_document_file(uploaded_file):
    max_upload_bytes = settings.PATIENT_DOCUMENT_MAX_UPLOAD_BYTES
    if uploaded_file.size and uploaded_file.size > max_upload_bytes:
        max_mb = max_upload_bytes / (1024 * 1024)
        raise DocumentPdfError(f"Document must be {max_mb:.0f} MB or smaller.")

    content_type = (uploaded_file.content_type or "").lower()
    filename = (uploaded_file.name or "").lower()
    format_rules = SUPPORTED_DOCUMENT_FORMATS.get(content_type)
    if format_rules is None:
        raise DocumentPdfError("Upload a PDF, TIFF, PNG, or JPG document.")

    extensions, magic_prefixes = format_rules
    header = uploaded_file.read(8)
    uploaded_file.seek(0)
    if not filename.endswith(extensions) or not header.startswith(magic_prefixes):
        raise DocumentPdfError("Upload a PDF, TIFF, PNG, or JPG document.")


def build_combined_pdf(documents, storage):
    max_bundle_bytes = settings.PATIENT_DOCUMENT_MAX_BUNDLE_BYTES
    total_bytes = sum(document.file_size_bytes or 0 for document in documents)
    if total_bytes > max_bundle_bytes:
        max_mb = max_bundle_bytes / (1024 * 1024)
        raise DocumentPdfError(f"Document bundle must be {max_mb:.0f} MB or smaller.")

    writer = PdfWriter()
    max_pages = settings.PATIENT_DOCUMENT_MAX_BUNDLE_PAGES

    for document in documents:
        if not document.storage_key:
            raise DocumentPdfError(
                f"{document.name} cannot be bundled because it is externally stored."
            )

        if not storage.exists(document.storage_key):
            raise DocumentPdfError(f"{document.name} file was not found.")

        content_type = (document.content_type or "").lower()
        with storage.open(document.storage_key) as file_obj:
            file_bytes = file_obj.read()

        if content_type == "application/pdf":
            _append_pdf(writer, file_bytes, document.name)
        elif content_type in {"image/jpeg", "image/png", "image/tiff"}:
            _append_image_pdf(writer, file_bytes, document.name)
        else:
            raise DocumentPdfError(f"{document.name} is not a supported bundle type.")

        if len(writer.pages) > max_pages:
            raise DocumentPdfError(f"Document bundle cannot exceed {max_pages} pages.")

    if len(writer.pages) == 0:
        raise DocumentPdfError("No PDF pages could be created.")

    output = BytesIO()
    writer.write(output)
    output.seek(0)
    return output


def _append_pdf(writer, file_bytes, document_name):
    try:
        reader = PdfReader(BytesIO(file_bytes))
        if len(reader.pages) == 0:
            raise DocumentPdfError(f"{document_name} has no PDF pages.")

        for page in reader.pages:
            writer.add_page(page)
    except (PdfReadError, ValueError) as exc:
        raise DocumentPdfError(f"{document_name} is not a readable PDF.") from exc


def _append_image_pdf(writer, file_bytes, document_name):
    try:
        image = Image.open(BytesIO(file_bytes))
        frames = []

        for frame_index in range(getattr(image, "n_frames", 1)):
            image.seek(frame_index)
            normalized = ImageOps.exif_transpose(image)
            if normalized.mode in ("RGBA", "LA"):
                background = Image.new("RGB", normalized.size, "white")
                alpha = normalized.getchannel("A")
                background.paste(normalized.convert("RGB"), mask=alpha)
                normalized = background
            else:
                normalized = normalized.convert("RGB")
            frames.append(normalized.copy())

        if not frames:
            raise DocumentPdfError(f"{document_name} has no image pages.")

        pdf_bytes = BytesIO()
        first, *rest = frames
        first.save(pdf_bytes, format="PDF", save_all=True, append_images=rest)
        pdf_bytes.seek(0)
        _append_pdf(writer, pdf_bytes.read(), document_name)
    except (UnidentifiedImageError, OSError) as exc:
        raise DocumentPdfError(f"{document_name} is not a readable image.") from exc
