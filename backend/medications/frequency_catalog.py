"""
Standardized prescribing frequencies.

Each entry is (code, label, times_per_day). ``times_per_day`` is a coarse
hint for downstream daily-dose calculations; ``None`` for as-needed or
non-daily schedules.
"""

FREQUENCY_CATALOG = [
    ("QD", "Once daily", 1),
    ("BID", "Twice daily", 2),
    ("TID", "Three times daily", 3),
    ("QID", "Four times daily", 4),
    ("Q4H", "Every 4 hours", 6),
    ("Q6H", "Every 6 hours", 4),
    ("Q8H", "Every 8 hours", 3),
    ("Q12H", "Every 12 hours", 2),
    ("QAM", "Every morning", 1),
    ("QPM", "Every evening", 1),
    ("QHS", "At bedtime", 1),
    ("QOD", "Every other day", None),
    ("QWK", "Once weekly", None),
    ("BIW", "Twice weekly", None),
    ("TIW", "Three times weekly", None),
    ("QMO", "Once monthly", None),
    ("PRN", "As needed", None),
    ("STAT", "Immediately, once", None),
    ("AC", "Before meals", 3),
    ("PC", "After meals", 3),
    ("WITH_MEALS", "With meals", 3),
    ("ONCE", "One-time dose", None),
]


def get_catalog_entries():
    return [
        {"code": code, "label": label, "times_per_day": tpd}
        for code, label, tpd in FREQUENCY_CATALOG
    ]
