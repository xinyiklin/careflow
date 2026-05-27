"""
Standardized medication routes of administration.

Each entry is (code, label). Codes are short, prescriber-facing abbreviations;
labels are the spelled-out form for patient-facing surfaces.
"""

ROUTE_CATALOG = [
    ("PO", "Oral (by mouth)"),
    ("SL", "Sublingual"),
    ("BUCC", "Buccal"),
    ("IV", "Intravenous"),
    ("IM", "Intramuscular"),
    ("SC", "Subcutaneous"),
    ("ID", "Intradermal"),
    ("IO", "Intraosseous"),
    ("IT", "Intrathecal"),
    ("TOP", "Topical"),
    ("TD", "Transdermal"),
    ("OPHTH", "Ophthalmic (eye)"),
    ("OTIC", "Otic (ear)"),
    ("NASAL", "Nasal"),
    ("INH", "Inhalation"),
    ("NEB", "Nebulized"),
    ("PR", "Rectal"),
    ("PV", "Vaginal"),
    ("PEG", "Per gastrostomy tube"),
    ("NG", "Per nasogastric tube"),
    ("EPI", "Epidural"),
    ("INF", "Infiltration"),
    ("IRR", "Irrigation"),
]


def get_catalog_entries():
    return [{"code": code, "label": label} for code, label in ROUTE_CATALOG]
