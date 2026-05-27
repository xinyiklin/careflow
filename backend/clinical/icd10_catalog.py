"""
Common outpatient ICD-10-CM diagnosis catalog.

Each entry is (code, description, chapter). The catalog covers the most
frequently used codes across primary care, urgent care, and routine
preventive visits; it is not exhaustive (ICD-10-CM contains ~70k codes).
Clinicians can still chart unlisted codes as free text on the assessment
field of a progress note.
"""

CHAPTER_INFECTIONS = "Infectious & parasitic"
CHAPTER_NEOPLASMS = "Neoplasms"
CHAPTER_BLOOD = "Blood & immune"
CHAPTER_ENDOCRINE = "Endocrine, nutritional, metabolic"
CHAPTER_MENTAL = "Mental & behavioral"
CHAPTER_NERVOUS = "Nervous system"
CHAPTER_EYE = "Eye"
CHAPTER_EAR = "Ear"
CHAPTER_CIRCULATORY = "Circulatory"
CHAPTER_RESPIRATORY = "Respiratory"
CHAPTER_DIGESTIVE = "Digestive"
CHAPTER_SKIN = "Skin & subcutaneous"
CHAPTER_MSK = "Musculoskeletal & connective tissue"
CHAPTER_GU = "Genitourinary"
CHAPTER_PREGNANCY = "Pregnancy & childbirth"
CHAPTER_SYMPTOMS = "Symptoms & abnormal findings"
CHAPTER_INJURY = "Injury & poisoning"
CHAPTER_HEALTH_STATUS = "Health status / encounters"

ICD10_CATALOG = [
    # ── Infectious & parasitic ────────────────────────────────────────
    ("B34.9", "Viral infection, unspecified", CHAPTER_INFECTIONS),
    ("J06.9", "Acute upper respiratory infection, unspecified", CHAPTER_INFECTIONS),
    ("A09", "Infectious gastroenteritis and colitis, unspecified", CHAPTER_INFECTIONS),
    ("B37.3", "Candidiasis of vulva and vagina", CHAPTER_INFECTIONS),
    ("L03.90", "Cellulitis, unspecified", CHAPTER_INFECTIONS),
    ("U07.1", "COVID-19", CHAPTER_INFECTIONS),
    ("J11.1", "Influenza with other respiratory manifestations", CHAPTER_INFECTIONS),
    # ── Endocrine / metabolic ─────────────────────────────────────────
    ("E11.9", "Type 2 diabetes mellitus without complications", CHAPTER_ENDOCRINE),
    ("E11.65", "Type 2 diabetes mellitus with hyperglycemia", CHAPTER_ENDOCRINE),
    ("E10.9", "Type 1 diabetes mellitus without complications", CHAPTER_ENDOCRINE),
    ("E78.5", "Hyperlipidemia, unspecified", CHAPTER_ENDOCRINE),
    ("E78.00", "Pure hypercholesterolemia, unspecified", CHAPTER_ENDOCRINE),
    ("E03.9", "Hypothyroidism, unspecified", CHAPTER_ENDOCRINE),
    (
        "E05.90",
        "Thyrotoxicosis, unspecified without thyrotoxic crisis",
        CHAPTER_ENDOCRINE,
    ),
    ("E66.9", "Obesity, unspecified", CHAPTER_ENDOCRINE),
    ("E55.9", "Vitamin D deficiency, unspecified", CHAPTER_ENDOCRINE),
    ("E83.42", "Hypomagnesemia", CHAPTER_ENDOCRINE),
    # ── Mental & behavioral ───────────────────────────────────────────
    ("F32.9", "Major depressive disorder, single episode, unspecified", CHAPTER_MENTAL),
    ("F33.1", "Major depressive disorder, recurrent, moderate", CHAPTER_MENTAL),
    ("F41.1", "Generalized anxiety disorder", CHAPTER_MENTAL),
    ("F41.9", "Anxiety disorder, unspecified", CHAPTER_MENTAL),
    ("F43.10", "Post-traumatic stress disorder, unspecified", CHAPTER_MENTAL),
    ("F43.21", "Adjustment disorder with depressed mood", CHAPTER_MENTAL),
    ("F51.01", "Primary insomnia", CHAPTER_MENTAL),
    (
        "F90.9",
        "Attention-deficit hyperactivity disorder, unspecified type",
        CHAPTER_MENTAL,
    ),
    ("F10.20", "Alcohol dependence, uncomplicated", CHAPTER_MENTAL),
    ("F17.210", "Nicotine dependence, cigarettes, uncomplicated", CHAPTER_MENTAL),
    # ── Nervous system ───────────────────────────────────────────────
    (
        "G43.909",
        "Migraine, unspecified, not intractable, without status migrainosus",
        CHAPTER_NERVOUS,
    ),
    ("G44.209", "Tension-type headache, unspecified, not intractable", CHAPTER_NERVOUS),
    ("R51.9", "Headache, unspecified", CHAPTER_NERVOUS),
    ("G47.00", "Insomnia, unspecified", CHAPTER_NERVOUS),
    ("G47.33", "Obstructive sleep apnea (adult) (pediatric)", CHAPTER_NERVOUS),
    ("G56.00", "Carpal tunnel syndrome, unspecified upper limb", CHAPTER_NERVOUS),
    # ── Circulatory ──────────────────────────────────────────────────
    ("I10", "Essential (primary) hypertension", CHAPTER_CIRCULATORY),
    (
        "I25.10",
        "Atherosclerotic heart disease of native coronary artery without angina",
        CHAPTER_CIRCULATORY,
    ),
    ("I48.91", "Unspecified atrial fibrillation", CHAPTER_CIRCULATORY),
    ("I50.9", "Heart failure, unspecified", CHAPTER_CIRCULATORY),
    (
        "R03.0",
        "Elevated blood-pressure reading, without diagnosis of hypertension",
        CHAPTER_CIRCULATORY,
    ),
    (
        "I83.90",
        "Asymptomatic varicose veins of unspecified lower extremity",
        CHAPTER_CIRCULATORY,
    ),
    # ── Respiratory ──────────────────────────────────────────────────
    ("J45.909", "Unspecified asthma, uncomplicated", CHAPTER_RESPIRATORY),
    (
        "J44.9",
        "Chronic obstructive pulmonary disease, unspecified",
        CHAPTER_RESPIRATORY,
    ),
    ("J20.9", "Acute bronchitis, unspecified", CHAPTER_RESPIRATORY),
    ("J30.9", "Allergic rhinitis, unspecified", CHAPTER_RESPIRATORY),
    ("J02.9", "Acute pharyngitis, unspecified", CHAPTER_RESPIRATORY),
    ("J01.90", "Acute sinusitis, unspecified", CHAPTER_RESPIRATORY),
    ("J18.9", "Pneumonia, unspecified organism", CHAPTER_RESPIRATORY),
    # ── Digestive ────────────────────────────────────────────────────
    (
        "K21.9",
        "Gastro-esophageal reflux disease without esophagitis",
        CHAPTER_DIGESTIVE,
    ),
    ("K30", "Functional dyspepsia", CHAPTER_DIGESTIVE),
    ("K58.9", "Irritable bowel syndrome without diarrhea", CHAPTER_DIGESTIVE),
    ("K59.00", "Constipation, unspecified", CHAPTER_DIGESTIVE),
    ("K92.1", "Melena", CHAPTER_DIGESTIVE),
    ("R10.9", "Unspecified abdominal pain", CHAPTER_DIGESTIVE),
    ("K76.0", "Fatty (change of) liver, not elsewhere classified", CHAPTER_DIGESTIVE),
    # ── Skin & subcutaneous ──────────────────────────────────────────
    ("L20.9", "Atopic dermatitis, unspecified", CHAPTER_SKIN),
    ("L30.9", "Dermatitis, unspecified", CHAPTER_SKIN),
    ("L40.0", "Psoriasis vulgaris", CHAPTER_SKIN),
    ("L70.0", "Acne vulgaris", CHAPTER_SKIN),
    ("L50.9", "Urticaria, unspecified", CHAPTER_SKIN),
    # ── Musculoskeletal ──────────────────────────────────────────────
    ("M54.50", "Low back pain, unspecified", CHAPTER_MSK),
    ("M54.2", "Cervicalgia", CHAPTER_MSK),
    ("M25.561", "Pain in right knee", CHAPTER_MSK),
    ("M25.562", "Pain in left knee", CHAPTER_MSK),
    ("M25.511", "Pain in right shoulder", CHAPTER_MSK),
    ("M25.512", "Pain in left shoulder", CHAPTER_MSK),
    ("M79.604", "Pain in right leg", CHAPTER_MSK),
    ("M79.605", "Pain in left leg", CHAPTER_MSK),
    ("M17.11", "Unilateral primary osteoarthritis, right knee", CHAPTER_MSK),
    ("M17.12", "Unilateral primary osteoarthritis, left knee", CHAPTER_MSK),
    ("M19.90", "Unspecified osteoarthritis, unspecified site", CHAPTER_MSK),
    ("M62.838", "Other muscle spasm", CHAPTER_MSK),
    (
        "M81.0",
        "Age-related osteoporosis without current pathological fracture",
        CHAPTER_MSK,
    ),
    # ── Genitourinary ────────────────────────────────────────────────
    ("N39.0", "Urinary tract infection, site not specified", CHAPTER_GU),
    ("N18.3", "Chronic kidney disease, stage 3 (moderate)", CHAPTER_GU),
    ("N18.9", "Chronic kidney disease, unspecified", CHAPTER_GU),
    (
        "N40.0",
        "Benign prostatic hyperplasia without lower urinary-tract symptoms",
        CHAPTER_GU,
    ),
    ("N92.0", "Excessive and frequent menstruation with regular cycle", CHAPTER_GU),
    ("N94.6", "Dysmenorrhea, unspecified", CHAPTER_GU),
    # ── Pregnancy & childbirth ──────────────────────────────────────
    (
        "Z34.90",
        "Encounter for supervision of normal pregnancy, unspecified, unspecified trimester",
        CHAPTER_PREGNANCY,
    ),
    ("O80", "Encounter for full-term uncomplicated delivery", CHAPTER_PREGNANCY),
    # ── Symptoms & abnormal findings ────────────────────────────────
    ("R05.9", "Cough, unspecified", CHAPTER_SYMPTOMS),
    ("R06.02", "Shortness of breath", CHAPTER_SYMPTOMS),
    ("R07.9", "Chest pain, unspecified", CHAPTER_SYMPTOMS),
    ("R11.10", "Vomiting, unspecified", CHAPTER_SYMPTOMS),
    ("R19.7", "Diarrhea, unspecified", CHAPTER_SYMPTOMS),
    ("R42", "Dizziness and giddiness", CHAPTER_SYMPTOMS),
    ("R50.9", "Fever, unspecified", CHAPTER_SYMPTOMS),
    ("R53.83", "Other fatigue", CHAPTER_SYMPTOMS),
    ("R63.4", "Abnormal weight loss", CHAPTER_SYMPTOMS),
    ("R63.5", "Abnormal weight gain", CHAPTER_SYMPTOMS),
    ("R73.03", "Prediabetes", CHAPTER_SYMPTOMS),
    # ── Injury & poisoning ──────────────────────────────────────────
    (
        "S93.401A",
        "Sprain of unspecified ligament of right ankle, initial encounter",
        CHAPTER_INJURY,
    ),
    (
        "S93.402A",
        "Sprain of unspecified ligament of left ankle, initial encounter",
        CHAPTER_INJURY,
    ),
    ("T78.40XA", "Allergy, unspecified, initial encounter", CHAPTER_INJURY),
    # ── Health status / encounters ──────────────────────────────────
    (
        "Z00.00",
        "Encounter for general adult medical examination without abnormal findings",
        CHAPTER_HEALTH_STATUS,
    ),
    (
        "Z00.01",
        "Encounter for general adult medical examination with abnormal findings",
        CHAPTER_HEALTH_STATUS,
    ),
    (
        "Z00.121",
        "Encounter for routine child health examination with abnormal findings",
        CHAPTER_HEALTH_STATUS,
    ),
    (
        "Z00.129",
        "Encounter for routine child health examination without abnormal findings",
        CHAPTER_HEALTH_STATUS,
    ),
    ("Z23", "Encounter for immunization", CHAPTER_HEALTH_STATUS),
    ("Z79.4", "Long term (current) use of insulin", CHAPTER_HEALTH_STATUS),
    (
        "Z79.84",
        "Long term (current) use of oral hypoglycemic drugs",
        CHAPTER_HEALTH_STATUS,
    ),
    ("Z79.899", "Other long term (current) drug therapy", CHAPTER_HEALTH_STATUS),
    ("Z71.3", "Dietary counseling and surveillance", CHAPTER_HEALTH_STATUS),
    ("Z72.0", "Tobacco use", CHAPTER_HEALTH_STATUS),
    ("Z87.891", "Personal history of nicotine dependence", CHAPTER_HEALTH_STATUS),
    (
        "Z51.81",
        "Encounter for therapeutic drug level monitoring",
        CHAPTER_HEALTH_STATUS,
    ),
]


ICD10_CATALOG_BY_CODE = {entry[0]: entry for entry in ICD10_CATALOG}
ICD10_CHAPTERS = sorted({entry[2] for entry in ICD10_CATALOG})


def get_catalog_entries():
    return [
        {"code": code, "description": description, "chapter": chapter}
        for code, description, chapter in ICD10_CATALOG
    ]
