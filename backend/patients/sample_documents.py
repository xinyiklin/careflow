from datetime import date, timedelta
from random import Random

from .models import PatientDocument

SAMPLE_DOCUMENTS = [
    {
        "name": "Primary Care Visit Summary.pdf",
        "category": PatientDocument.CATEGORY_CLINICAL,
        "days_ago": 3,
        "uploaded_by_name": "Care Team",
    },
    {
        "name": "CBC with Differential Results.pdf",
        "category": PatientDocument.CATEGORY_LAB,
        "days_ago": 6,
        "uploaded_by_name": "CareFlow Lab Interface",
    },
    {
        "name": "Chest X-Ray Report.pdf",
        "category": PatientDocument.CATEGORY_IMAGING,
        "days_ago": 14,
        "uploaded_by_name": "Radiology Queue",
    },
    {
        "name": "Cardiology Referral Note.pdf",
        "category": PatientDocument.CATEGORY_REFERRALS,
        "days_ago": 21,
        "uploaded_by_name": "Front Desk",
    },
    {
        "name": "Signed HIPAA Consent.pdf",
        "category": PatientDocument.CATEGORY_CONSENT,
        "days_ago": 32,
        "uploaded_by_name": "Registration",
    },
    {
        "name": "Insurance Benefits Snapshot.pdf",
        "category": PatientDocument.CATEGORY_INSURANCE,
        "days_ago": 45,
        "uploaded_by_name": "Registration",
    },
]


def get_sample_document_by_name(name):
    return next(
        (document for document in SAMPLE_DOCUMENTS if document["name"] == name),
        None,
    )


def get_sample_document_defaults(patient, document, today=None):
    today = today or date.today()
    document_date = today - timedelta(days=document["days_ago"])
    pdf_bytes = build_sample_pdf(patient, document, document_date)

    return {
        "category": document["category"],
        "document_date": document_date,
        "uploaded_by_name": document["uploaded_by_name"],
        "file_size_display": format_file_size(len(pdf_bytes)),
        "file_size_bytes": len(pdf_bytes),
        "content_type": "application/pdf",
        "original_filename": document["name"],
        "pdf_bytes": pdf_bytes,
        "notes": "Synthetic sample document for testing document workflows.",
        "is_active": True,
    }


def save_sample_pdf(storage, patient, document, today=None):
    defaults = get_sample_document_defaults(patient, document, today=today)
    storage_key = storage.save_bytes(
        defaults.pop("pdf_bytes"),
        patient_id=patient.id,
        filename=document["name"],
    )
    return storage_key, defaults


def build_sample_pdf(patient, document, document_date):
    rng = Random(f"{patient.id}:{document['name']}:{document_date.isoformat()}")
    lines = [
        "CareFlow Synthetic Document",
        f"Document: {document['name']}",
        f"Patient: {patient.first_name} {patient.last_name}",
        f"MRN: {patient.chart_number or 'Unassigned'}",
        f"DOB: {patient.date_of_birth.isoformat() if patient.date_of_birth else 'Unknown'}",
        f"Facility: {patient.facility.name}",
        f"Document Date: {document_date.isoformat()}",
        "",
        *get_document_body_lines(document, rng),
        "",
        "Demo notice: synthetic data generated for CareFlow local development.",
        "No real patient information is present in this document.",
    ]
    return render_text_pdf(lines)


def get_document_body_lines(document, rng):
    if document["category"] == PatientDocument.CATEGORY_CLINICAL:
        return [
            "PRIMARY CARE VISIT SUMMARY",
            "Chief concern: Routine follow-up and care-gap review.",
            "Assessment: Stable chronic conditions in this synthetic chart.",
            "Plan: Continue current medications and schedule preventive screening.",
            "Follow-up: Return visit recommended in 3 months.",
        ]

    if document["category"] == PatientDocument.CATEGORY_LAB:
        return [
            "CBC WITH DIFFERENTIAL",
            f"WBC: {rng.uniform(4.2, 9.8):.1f} K/uL",
            f"RBC: {rng.uniform(4.0, 5.7):.2f} M/uL",
            f"Hemoglobin: {rng.uniform(12.1, 16.4):.1f} g/dL",
            f"Platelets: {rng.randint(170, 360)} K/uL",
            "Interpretation: Values reviewed for routine clinical follow-up.",
        ]

    if document["category"] == PatientDocument.CATEGORY_IMAGING:
        return [
            "RADIOLOGY REPORT",
            "Exam: Chest radiograph, two views",
            "Findings: Cardiomediastinal silhouette is within expected size.",
            "No focal infiltrate, pleural effusion, or pneumothorax identified.",
            "Impression: No acute cardiopulmonary abnormality in this demo report.",
        ]

    if document["category"] == PatientDocument.CATEGORY_REFERRALS:
        return [
            "REFERRAL SUMMARY",
            "Reason: Specialty consultation requested for longitudinal care planning.",
            "Clinical notes: Recent visit summary and medication list reviewed.",
            "Requested action: Please evaluate and return recommendations to PCP.",
        ]

    if document["category"] == PatientDocument.CATEGORY_CONSENT:
        return [
            "SIGNED CONSENT",
            "Patient reviewed clinic privacy and treatment consent materials.",
            "Signature status: Captured electronically for demo workflow testing.",
            "Witness: Registration team",
        ]

    if document["category"] == PatientDocument.CATEGORY_INSURANCE:
        return [
            "INSURANCE BENEFITS SNAPSHOT",
            f"Plan reference: DEMO-{rng.randint(100000, 999999)}",
            "Coverage status: Active for demo workflow testing.",
            "Eligibility note: Synthetic benefits summary indexed to chart.",
        ]

    return [
        "ADMINISTRATIVE DOCUMENT",
        "Document type: Administrative record",
        "Record was indexed into the patient chart for demo workflow testing.",
    ]


def render_text_pdf(lines):
    content_lines = ["BT", "/F1 16 Tf", "72 740 Td"]
    first_line = True

    for line in lines:
        if not first_line:
            content_lines.append("0 -22 Td")
        first_line = False

        font_size = 16 if line == "CareFlow Synthetic Document" else 11
        content_lines.append(f"/F1 {font_size} Tf")
        content_lines.append(f"({_escape_pdf_text(line)}) Tj")

    content_lines.append("ET")
    content = "\n".join(content_lines).encode("latin-1")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        (
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>"
        ),
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length "
        + str(len(content)).encode("ascii")
        + b" >>\nstream\n"
        + content
        + b"\nendstream",
    ]

    pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("ascii"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_offset = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF\n"
        ).encode("ascii")
    )

    return bytes(pdf)


def format_file_size(size):
    if size >= 1024 * 1024:
        return f"{size / (1024 * 1024):.1f} MB"
    if size >= 1024:
        return f"{size / 1024:.0f} KB"
    return f"{size} B"


def _escape_pdf_text(value):
    return str(value).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
