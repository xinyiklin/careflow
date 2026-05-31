"""Static seed data: pure module-level constants only (no DB access, no RNG)."""

from datetime import time

from allergies.models import PatientAllergy

FIRST_NAMES = [
    "John",
    "Jane",
    "Mike",
    "Emily",
    "Chris",
    "Sarah",
    "David",
    "Anna",
    "Kevin",
    "Laura",
    "Brian",
    "Olivia",
    "Daniel",
    "Sophia",
    "James",
    "Grace",
    "Leo",
    "Ava",
    "Noah",
    "Mia",
    "Liam",
    "Emma",
]

LAST_NAMES = [
    "Smith",
    "Johnson",
    "Lee",
    "Brown",
    "Davis",
    "Wilson",
    "Martinez",
    "Anderson",
    "Thomas",
    "Moore",
    "Jackson",
    "Martin",
    "White",
    "Clark",
    "Young",
    "Harris",
]

REASONS = [
    "Routine follow-up",
    "New patient visit",
    "Annual exam",
    "Medication review",
    "Blood pressure check",
    "Lab review",
    "Consultation",
    "Post-op follow-up",
    "Diabetes management",
    "Vaccination visit",
]

FACILITY_SPECS = [
    {
        "name": "Clinic A",
        "timezone": "America/New_York",
        "facility_code": "A",
        "phone_number": "(212) 555-1001",
        "fax_number": "(212) 555-1002",
        "email": "clinic-a@careflow.xinyiklin.com",
        "operating_start_time": time(8, 0),
        "operating_end_time": time(17, 0),
        "operating_days": [1, 2, 3, 4, 5],
        "address": {
            "line_1": "184 Linden Avenue",
            "city": "New York",
            "state": "NY",
            "zip_code": "10001",
        },
        "notes": "Seeded demo clinic for local development workflows.",
    },
    {
        "name": "Clinic B",
        "timezone": "America/New_York",
        "facility_code": "B",
        "phone_number": "(718) 555-2001",
        "fax_number": "(718) 555-2002",
        "email": "clinic-b@careflow.xinyiklin.com",
        "operating_start_time": time(9, 0),
        "operating_end_time": time(18, 0),
        "operating_days": [1, 2, 3, 4, 5],
        "address": {
            "line_1": "72 Maple Court",
            "city": "Queens",
            "state": "NY",
            "zip_code": "11101",
        },
        "notes": "Seeded demo clinic for local development workflows.",
    },
    {
        "name": "Clinic C",
        "timezone": "America/New_York",
        "facility_code": "C",
        "phone_number": "(646) 555-3001",
        "fax_number": "(646) 555-3002",
        "email": "clinic-c@careflow.xinyiklin.com",
        "operating_start_time": time(8, 30),
        "operating_end_time": time(16, 30),
        "operating_days": [1, 2, 3, 4],
        "address": {
            "line_1": "309 Cedar Street",
            "city": "New York",
            "state": "NY",
            "zip_code": "10007",
        },
        "notes": "Seeded demo clinic for local development workflows.",
    },
]

CARRIER_SPECS = [
    {
        "name": "MetroPlus Gold",
        "payer_id": "MTP001",
        "phone_number": "(800) 555-4100",
        "website": "https://metroplus-demo.local",
        "address_line_1": "160 Water St",
        "address_line_2": "Floor 3",
        "city": "New York",
        "state": "NY",
        "zip_code": "10038",
    },
    {
        "name": "Empire Health",
        "payer_id": "EMP002",
        "phone_number": "(800) 555-4200",
        "website": "https://empire-demo.local",
        "address_line_1": "11 W 42nd St",
        "address_line_2": "",
        "city": "New York",
        "state": "NY",
        "zip_code": "10036",
    },
    {
        "name": "United Community Plan",
        "payer_id": "UCP003",
        "phone_number": "(800) 555-4300",
        "website": "https://community-demo.local",
        "address_line_1": "2950 Expressway Dr S",
        "address_line_2": "Suite 100",
        "city": "Islandia",
        "state": "NY",
        "zip_code": "11749",
    },
]

MEDICATION_TEMPLATES = [
    {
        "medication_name": "Lisinopril",
        "dose": "10 mg",
        "route": "Oral",
        "frequency": "Once daily",
        "notes": "Blood pressure management.",
    },
    {
        "medication_name": "Metformin ER",
        "dose": "500 mg",
        "route": "Oral",
        "frequency": "Twice daily with meals",
        "notes": "Review A1c at next chronic care visit.",
    },
    {
        "medication_name": "Atorvastatin",
        "dose": "20 mg",
        "route": "Oral",
        "frequency": "Nightly",
        "notes": "Lipid management.",
    },
    {
        "medication_name": "Albuterol HFA",
        "dose": "90 mcg",
        "route": "Inhaled",
        "frequency": "Two puffs every 4-6 hours as needed",
        "notes": "Rescue inhaler for intermittent wheezing.",
    },
]

ALLERGY_TEMPLATES = [
    {
        "allergen": "Penicillin",
        "category": PatientAllergy.CATEGORY_MEDICATION,
        "reaction": "Hives and facial swelling",
        "severity": PatientAllergy.SEVERITY_SEVERE,
        "notes": "Avoid beta-lactam antibiotics unless reviewed.",
    },
    {
        "allergen": "Shellfish",
        "category": PatientAllergy.CATEGORY_FOOD,
        "reaction": "Diffuse rash and nausea",
        "severity": PatientAllergy.SEVERITY_MODERATE,
        "notes": "Patient carries OTC antihistamine.",
    },
    {
        "allergen": "Latex",
        "category": PatientAllergy.CATEGORY_LATEX,
        "reaction": "Contact dermatitis",
        "severity": PatientAllergy.SEVERITY_MILD,
        "notes": "Use non-latex supplies.",
    },
    {
        "allergen": "Iodinated contrast",
        "category": PatientAllergy.CATEGORY_CONTRAST,
        "reaction": "Shortness of breath",
        "severity": PatientAllergy.SEVERITY_SEVERE,
        "notes": "Requires clinician review before imaging with contrast.",
    },
]

CLINICAL_NOTE_TEMPLATES = [
    {
        "reason": "Hypertension follow-up",
        "subjective": "Patient reports taking medications consistently and denies chest pain or shortness of breath.",
        "objective": "Blood pressure improved compared with prior visit. No acute distress.",
        "assessment": "Essential hypertension, improving with current regimen.",
        "plan": "Continue current medication, reinforce low-sodium diet, and recheck blood pressure in 4 weeks.",
        "diagnosis": ("I10", "Essential hypertension"),
        "service": (
            "99214",
            "Established patient office visit, moderate complexity",
            "165.00",
        ),
    },
    {
        "reason": "Diabetes management",
        "subjective": "Patient brought home glucose log and reports no hypoglycemic episodes.",
        "objective": "Foot exam normal. Labs reviewed with patient.",
        "assessment": "Type 2 diabetes mellitus without complication.",
        "plan": "Continue metformin, order A1c, and schedule nutrition follow-up.",
        "diagnosis": (
            "E11.9",
            "Type 2 diabetes mellitus without complications",
        ),
        "service": (
            "99214",
            "Established patient office visit, moderate complexity",
            "165.00",
        ),
    },
    {
        "reason": "Upper respiratory symptoms",
        "subjective": "Patient reports cough and congestion for four days without fever.",
        "objective": "Lungs clear to auscultation. Oxygen saturation stable.",
        "assessment": "Acute upper respiratory infection, likely viral.",
        "plan": "Supportive care, hydration, and return precautions reviewed.",
        "diagnosis": (
            "J06.9",
            "Acute upper respiratory infection, unspecified",
        ),
        "service": (
            "99213",
            "Established patient office visit, low complexity",
            "110.00",
        ),
    },
    {
        "reason": "Preventive exam",
        "subjective": "Patient presents for annual preventive visit with no acute concerns.",
        "objective": "Preventive screening and immunization history reviewed.",
        "assessment": "Routine adult health maintenance.",
        "plan": "Update preventive labs, review age-appropriate screening, and follow up annually.",
        "diagnosis": (
            "Z00.00",
            "Encounter for general adult medical examination",
        ),
        "service": (
            "99395",
            "Preventive medicine established patient visit",
            "185.00",
        ),
    },
]
