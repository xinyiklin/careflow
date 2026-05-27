"""
Common outpatient medication catalog.

Each entry is (generic_name, common_strengths, default_route,
default_frequency, category). Used for clinician autocomplete and patient
refill request lookup; entries are not exhaustive and patients may have
medications outside this catalog (handled as free-text on
:class:`Medication`).

``common_strengths`` is a list of human-readable strings ("500 mg", "10 mg")
ordered from most-prescribed to least.
"""

CATEGORY_ANTIBIOTIC = "Antibiotic"
CATEGORY_ANTIVIRAL = "Antiviral"
CATEGORY_ANTIFUNGAL = "Antifungal"
CATEGORY_ANALGESIC = "Analgesic / Pain"
CATEGORY_NSAID = "NSAID"
CATEGORY_OPIOID = "Opioid"
CATEGORY_ANTIHISTAMINE = "Antihistamine"
CATEGORY_ANTIDEPRESSANT = "Antidepressant"
CATEGORY_ANXIOLYTIC = "Anxiolytic"
CATEGORY_ANTIPSYCHOTIC = "Antipsychotic"
CATEGORY_ANTICONVULSANT = "Anticonvulsant"
CATEGORY_ANTIHYPERTENSIVE = "Antihypertensive"
CATEGORY_STATIN = "Statin / Lipid-lowering"
CATEGORY_DIABETES = "Diabetes"
CATEGORY_GI = "GI / Acid suppression"
CATEGORY_RESPIRATORY = "Respiratory / Inhaler"
CATEGORY_THYROID = "Thyroid"
CATEGORY_ANTICOAGULANT = "Anticoagulant"
CATEGORY_CONTRACEPTION = "Contraception"
CATEGORY_VACCINE = "Vaccine"
CATEGORY_CORTICOSTEROID = "Corticosteroid"
CATEGORY_MUSCLE_RELAXANT = "Muscle relaxant"
CATEGORY_OTHER = "Other"

MEDICATION_CATALOG = [
    # ── Antibiotics ──────────────────────────────────────────────────
    ("Amoxicillin", ["500 mg", "875 mg", "250 mg"], "PO", "TID", CATEGORY_ANTIBIOTIC),
    (
        "Amoxicillin-clavulanate",
        ["875 mg / 125 mg", "500 mg / 125 mg"],
        "PO",
        "BID",
        CATEGORY_ANTIBIOTIC,
    ),
    ("Azithromycin", ["250 mg", "500 mg"], "PO", "QD", CATEGORY_ANTIBIOTIC),
    ("Cephalexin", ["500 mg", "250 mg"], "PO", "QID", CATEGORY_ANTIBIOTIC),
    ("Ciprofloxacin", ["500 mg", "250 mg", "750 mg"], "PO", "BID", CATEGORY_ANTIBIOTIC),
    ("Clindamycin", ["300 mg", "150 mg"], "PO", "QID", CATEGORY_ANTIBIOTIC),
    ("Doxycycline", ["100 mg", "50 mg"], "PO", "BID", CATEGORY_ANTIBIOTIC),
    ("Levofloxacin", ["500 mg", "750 mg"], "PO", "QD", CATEGORY_ANTIBIOTIC),
    ("Metronidazole", ["500 mg", "250 mg"], "PO", "TID", CATEGORY_ANTIBIOTIC),
    ("Nitrofurantoin", ["100 mg", "50 mg"], "PO", "BID", CATEGORY_ANTIBIOTIC),
    (
        "Trimethoprim-sulfamethoxazole",
        ["800 mg / 160 mg"],
        "PO",
        "BID",
        CATEGORY_ANTIBIOTIC,
    ),
    # ── Antivirals / antifungals ────────────────────────────────────
    ("Acyclovir", ["400 mg", "800 mg"], "PO", "TID", CATEGORY_ANTIVIRAL),
    ("Valacyclovir", ["500 mg", "1000 mg"], "PO", "BID", CATEGORY_ANTIVIRAL),
    ("Oseltamivir", ["75 mg"], "PO", "BID", CATEGORY_ANTIVIRAL),
    ("Fluconazole", ["150 mg", "100 mg", "50 mg"], "PO", "QD", CATEGORY_ANTIFUNGAL),
    # ── Pain / NSAIDs / opioids ─────────────────────────────────────
    ("Acetaminophen", ["500 mg", "325 mg", "650 mg"], "PO", "Q6H", CATEGORY_ANALGESIC),
    (
        "Ibuprofen",
        ["400 mg", "600 mg", "800 mg", "200 mg"],
        "PO",
        "TID",
        CATEGORY_NSAID,
    ),
    ("Naproxen", ["500 mg", "250 mg", "375 mg"], "PO", "BID", CATEGORY_NSAID),
    ("Meloxicam", ["15 mg", "7.5 mg"], "PO", "QD", CATEGORY_NSAID),
    ("Celecoxib", ["200 mg", "100 mg"], "PO", "QD", CATEGORY_NSAID),
    ("Diclofenac", ["50 mg", "75 mg"], "PO", "BID", CATEGORY_NSAID),
    ("Tramadol", ["50 mg", "100 mg"], "PO", "Q6H", CATEGORY_OPIOID),
    (
        "Hydrocodone-acetaminophen",
        ["5 mg / 325 mg", "10 mg / 325 mg"],
        "PO",
        "Q6H",
        CATEGORY_OPIOID,
    ),
    ("Oxycodone", ["5 mg", "10 mg"], "PO", "Q6H", CATEGORY_OPIOID),
    # ── Antihistamines / allergy ────────────────────────────────────
    ("Cetirizine", ["10 mg", "5 mg"], "PO", "QD", CATEGORY_ANTIHISTAMINE),
    ("Loratadine", ["10 mg"], "PO", "QD", CATEGORY_ANTIHISTAMINE),
    ("Fexofenadine", ["180 mg", "60 mg"], "PO", "QD", CATEGORY_ANTIHISTAMINE),
    ("Diphenhydramine", ["25 mg", "50 mg"], "PO", "Q6H", CATEGORY_ANTIHISTAMINE),
    (
        "Fluticasone nasal spray",
        ["50 mcg/spray"],
        "NASAL",
        "QD",
        CATEGORY_ANTIHISTAMINE,
    ),
    # ── Mental health ───────────────────────────────────────────────
    ("Sertraline", ["50 mg", "100 mg", "25 mg"], "PO", "QD", CATEGORY_ANTIDEPRESSANT),
    ("Fluoxetine", ["20 mg", "10 mg", "40 mg"], "PO", "QD", CATEGORY_ANTIDEPRESSANT),
    ("Escitalopram", ["10 mg", "20 mg", "5 mg"], "PO", "QD", CATEGORY_ANTIDEPRESSANT),
    ("Citalopram", ["20 mg", "10 mg", "40 mg"], "PO", "QD", CATEGORY_ANTIDEPRESSANT),
    ("Bupropion XL", ["150 mg", "300 mg"], "PO", "QD", CATEGORY_ANTIDEPRESSANT),
    (
        "Venlafaxine XR",
        ["75 mg", "150 mg", "37.5 mg"],
        "PO",
        "QD",
        CATEGORY_ANTIDEPRESSANT,
    ),
    ("Duloxetine", ["30 mg", "60 mg", "20 mg"], "PO", "QD", CATEGORY_ANTIDEPRESSANT),
    ("Trazodone", ["50 mg", "100 mg"], "PO", "QHS", CATEGORY_ANTIDEPRESSANT),
    ("Mirtazapine", ["15 mg", "30 mg"], "PO", "QHS", CATEGORY_ANTIDEPRESSANT),
    ("Alprazolam", ["0.25 mg", "0.5 mg", "1 mg"], "PO", "TID", CATEGORY_ANXIOLYTIC),
    ("Lorazepam", ["0.5 mg", "1 mg", "2 mg"], "PO", "TID", CATEGORY_ANXIOLYTIC),
    ("Clonazepam", ["0.5 mg", "1 mg"], "PO", "BID", CATEGORY_ANXIOLYTIC),
    ("Buspirone", ["10 mg", "15 mg"], "PO", "BID", CATEGORY_ANXIOLYTIC),
    (
        "Quetiapine",
        ["25 mg", "50 mg", "100 mg", "200 mg"],
        "PO",
        "QHS",
        CATEGORY_ANTIPSYCHOTIC,
    ),
    ("Risperidone", ["1 mg", "2 mg"], "PO", "BID", CATEGORY_ANTIPSYCHOTIC),
    # ── Anticonvulsant / neuro ──────────────────────────────────────
    (
        "Gabapentin",
        ["300 mg", "600 mg", "100 mg"],
        "PO",
        "TID",
        CATEGORY_ANTICONVULSANT,
    ),
    ("Pregabalin", ["75 mg", "150 mg"], "PO", "BID", CATEGORY_ANTICONVULSANT),
    ("Topiramate", ["50 mg", "100 mg", "25 mg"], "PO", "BID", CATEGORY_ANTICONVULSANT),
    (
        "Lamotrigine",
        ["100 mg", "25 mg", "200 mg"],
        "PO",
        "BID",
        CATEGORY_ANTICONVULSANT,
    ),
    # ── Cardiovascular ──────────────────────────────────────────────
    (
        "Lisinopril",
        ["10 mg", "20 mg", "5 mg", "40 mg"],
        "PO",
        "QD",
        CATEGORY_ANTIHYPERTENSIVE,
    ),
    ("Losartan", ["50 mg", "100 mg", "25 mg"], "PO", "QD", CATEGORY_ANTIHYPERTENSIVE),
    ("Amlodipine", ["5 mg", "10 mg", "2.5 mg"], "PO", "QD", CATEGORY_ANTIHYPERTENSIVE),
    (
        "Metoprolol succinate",
        ["25 mg", "50 mg", "100 mg"],
        "PO",
        "QD",
        CATEGORY_ANTIHYPERTENSIVE,
    ),
    ("Metoprolol tartrate", ["25 mg", "50 mg"], "PO", "BID", CATEGORY_ANTIHYPERTENSIVE),
    ("Atenolol", ["25 mg", "50 mg", "100 mg"], "PO", "QD", CATEGORY_ANTIHYPERTENSIVE),
    (
        "Hydrochlorothiazide",
        ["25 mg", "12.5 mg"],
        "PO",
        "QD",
        CATEGORY_ANTIHYPERTENSIVE,
    ),
    ("Furosemide", ["20 mg", "40 mg", "80 mg"], "PO", "QD", CATEGORY_ANTIHYPERTENSIVE),
    ("Spironolactone", ["25 mg", "50 mg"], "PO", "QD", CATEGORY_ANTIHYPERTENSIVE),
    (
        "Atorvastatin",
        ["20 mg", "40 mg", "10 mg", "80 mg"],
        "PO",
        "QHS",
        CATEGORY_STATIN,
    ),
    ("Rosuvastatin", ["10 mg", "20 mg", "5 mg"], "PO", "QHS", CATEGORY_STATIN),
    ("Simvastatin", ["20 mg", "40 mg"], "PO", "QHS", CATEGORY_STATIN),
    ("Pravastatin", ["40 mg", "20 mg"], "PO", "QHS", CATEGORY_STATIN),
    # ── Diabetes ────────────────────────────────────────────────────
    ("Metformin", ["500 mg", "1000 mg", "850 mg"], "PO", "BID", CATEGORY_DIABETES),
    ("Metformin ER", ["500 mg", "1000 mg"], "PO", "QD", CATEGORY_DIABETES),
    ("Glipizide", ["5 mg", "10 mg"], "PO", "QD", CATEGORY_DIABETES),
    ("Empagliflozin", ["10 mg", "25 mg"], "PO", "QD", CATEGORY_DIABETES),
    ("Sitagliptin", ["100 mg", "50 mg"], "PO", "QD", CATEGORY_DIABETES),
    ("Semaglutide", ["0.25 mg", "0.5 mg", "1 mg"], "SC", "QWK", CATEGORY_DIABETES),
    ("Insulin glargine", ["100 units/mL"], "SC", "QD", CATEGORY_DIABETES),
    ("Insulin lispro", ["100 units/mL"], "SC", "AC", CATEGORY_DIABETES),
    # ── GI ─────────────────────────────────────────────────────────
    ("Omeprazole", ["20 mg", "40 mg"], "PO", "QD", CATEGORY_GI),
    ("Pantoprazole", ["40 mg", "20 mg"], "PO", "QD", CATEGORY_GI),
    ("Esomeprazole", ["20 mg", "40 mg"], "PO", "QD", CATEGORY_GI),
    ("Famotidine", ["20 mg", "40 mg"], "PO", "BID", CATEGORY_GI),
    ("Ondansetron", ["4 mg", "8 mg"], "PO", "Q8H", CATEGORY_GI),
    ("Metoclopramide", ["10 mg"], "PO", "QID", CATEGORY_GI),
    # ── Respiratory ─────────────────────────────────────────────────
    ("Albuterol HFA inhaler", ["90 mcg/puff"], "INH", "Q6H", CATEGORY_RESPIRATORY),
    ("Albuterol nebulized", ["2.5 mg / 3 mL"], "NEB", "Q6H", CATEGORY_RESPIRATORY),
    (
        "Fluticasone-salmeterol",
        ["100/50", "250/50", "500/50"],
        "INH",
        "BID",
        CATEGORY_RESPIRATORY,
    ),
    (
        "Budesonide-formoterol",
        ["80/4.5", "160/4.5"],
        "INH",
        "BID",
        CATEGORY_RESPIRATORY,
    ),
    ("Montelukast", ["10 mg", "5 mg", "4 mg"], "PO", "QHS", CATEGORY_RESPIRATORY),
    ("Tiotropium", ["18 mcg"], "INH", "QD", CATEGORY_RESPIRATORY),
    # ── Thyroid / hormones / contraception ──────────────────────────
    (
        "Levothyroxine",
        ["50 mcg", "75 mcg", "100 mcg", "25 mcg", "125 mcg"],
        "PO",
        "QAM",
        CATEGORY_THYROID,
    ),
    ("Liothyronine", ["5 mcg", "25 mcg"], "PO", "QD", CATEGORY_THYROID),
    (
        "Norethindrone-ethinyl estradiol",
        ["0.5 mg / 35 mcg"],
        "PO",
        "QD",
        CATEGORY_CONTRACEPTION,
    ),
    ("Medroxyprogesterone IM", ["150 mg"], "IM", "QMO", CATEGORY_CONTRACEPTION),
    # ── Anticoagulants ─────────────────────────────────────────────
    ("Apixaban", ["5 mg", "2.5 mg"], "PO", "BID", CATEGORY_ANTICOAGULANT),
    ("Rivaroxaban", ["20 mg", "15 mg"], "PO", "QD", CATEGORY_ANTICOAGULANT),
    (
        "Warfarin",
        ["5 mg", "2.5 mg", "1 mg", "7.5 mg"],
        "PO",
        "QD",
        CATEGORY_ANTICOAGULANT,
    ),
    ("Enoxaparin", ["40 mg", "60 mg", "80 mg"], "SC", "QD", CATEGORY_ANTICOAGULANT),
    # ── Corticosteroids / misc ──────────────────────────────────────
    (
        "Prednisone",
        ["5 mg", "10 mg", "20 mg", "1 mg"],
        "PO",
        "QD",
        CATEGORY_CORTICOSTEROID,
    ),
    (
        "Methylprednisolone (Medrol Dosepak)",
        ["4 mg"],
        "PO",
        "QD",
        CATEGORY_CORTICOSTEROID,
    ),
    ("Hydrocortisone cream", ["1%", "2.5%"], "TOP", "BID", CATEGORY_CORTICOSTEROID),
    ("Triamcinolone cream", ["0.1%", "0.025%"], "TOP", "BID", CATEGORY_CORTICOSTEROID),
    ("Cyclobenzaprine", ["5 mg", "10 mg"], "PO", "TID", CATEGORY_MUSCLE_RELAXANT),
    ("Methocarbamol", ["500 mg", "750 mg"], "PO", "QID", CATEGORY_MUSCLE_RELAXANT),
    ("Tizanidine", ["2 mg", "4 mg"], "PO", "TID", CATEGORY_MUSCLE_RELAXANT),
]


MEDICATION_CATALOG_BY_NAME = {entry[0]: entry for entry in MEDICATION_CATALOG}
MEDICATION_CATEGORIES = sorted({entry[4] for entry in MEDICATION_CATALOG})


def get_catalog_entries():
    return [
        {
            "generic_name": name,
            "common_strengths": strengths,
            "default_route": route,
            "default_frequency": frequency,
            "category": category,
        }
        for name, strengths, route, frequency, category in MEDICATION_CATALOG
    ]
