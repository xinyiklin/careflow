"""
Standardized adverse-reaction descriptors for patient allergies.

Each entry is (label, default_severity). ``default_severity`` matches the
:class:`PatientAllergy` severity choices and is offered as a sensible
starting value in the clinician/patient UI; reviewers can override.
"""

from .models import PatientAllergy

_MILD = PatientAllergy.SEVERITY_MILD
_MODERATE = PatientAllergy.SEVERITY_MODERATE
_SEVERE = PatientAllergy.SEVERITY_SEVERE
_LIFE = PatientAllergy.SEVERITY_LIFE_THREATENING

REACTION_CATALOG = [
    ("Rash", _MILD),
    ("Hives (urticaria)", _MODERATE),
    ("Itching (pruritus)", _MILD),
    ("Flushing", _MILD),
    ("Localized swelling", _MILD),
    ("Angioedema (face, lips, tongue)", _SEVERE),
    ("Anaphylaxis", _LIFE),
    ("Difficulty breathing (dyspnea)", _SEVERE),
    ("Wheezing", _MODERATE),
    ("Bronchospasm", _SEVERE),
    ("Throat tightening", _SEVERE),
    ("Cough", _MILD),
    ("Runny nose (rhinorrhea)", _MILD),
    ("Nasal congestion", _MILD),
    ("Sneezing", _MILD),
    ("Watery eyes", _MILD),
    ("Conjunctivitis", _MILD),
    ("Nausea", _MILD),
    ("Vomiting", _MODERATE),
    ("Diarrhea", _MODERATE),
    ("Abdominal cramping", _MODERATE),
    ("Lightheadedness", _MODERATE),
    ("Dizziness", _MODERATE),
    ("Hypotension", _SEVERE),
    ("Tachycardia", _MODERATE),
    ("Loss of consciousness", _LIFE),
    ("Stevens-Johnson syndrome", _LIFE),
    ("Toxic epidermal necrolysis", _LIFE),
    ("Serum sickness", _SEVERE),
    ("Photosensitivity", _MILD),
    ("Headache", _MILD),
    ("Fatigue", _MILD),
    ("Muscle weakness", _MODERATE),
    ("Joint pain", _MILD),
    ("Mouth sores", _MILD),
    ("Tongue swelling", _SEVERE),
    ("Other (see notes)", PatientAllergy.SEVERITY_UNKNOWN),
]


def get_catalog_entries():
    return [
        {"label": label, "default_severity": severity}
        for label, severity in REACTION_CATALOG
    ]
