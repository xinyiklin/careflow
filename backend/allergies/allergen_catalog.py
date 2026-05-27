"""
Common allergens, grouped by category.

Each entry is (label, category). ``category`` matches the
:class:`PatientAllergy` category choices. Used to power autocomplete /
quick-pick options on allergy entry forms; reviewers may type free-text.
"""

from .models import PatientAllergy

_MED = PatientAllergy.CATEGORY_MEDICATION
_FOOD = PatientAllergy.CATEGORY_FOOD
_ENV = PatientAllergy.CATEGORY_ENVIRONMENTAL
_LATEX = PatientAllergy.CATEGORY_LATEX
_CONTRAST = PatientAllergy.CATEGORY_CONTRAST
_OTHER = PatientAllergy.CATEGORY_OTHER

ALLERGEN_CATALOG = [
    # ── Medications ──────────────────────────────────────────────────
    ("Penicillin", _MED),
    ("Amoxicillin", _MED),
    ("Ampicillin", _MED),
    ("Cephalosporins (general)", _MED),
    ("Cefazolin", _MED),
    ("Cefepime", _MED),
    ("Ceftriaxone", _MED),
    ("Sulfa antibiotics", _MED),
    ("Trimethoprim-sulfamethoxazole", _MED),
    ("Erythromycin", _MED),
    ("Azithromycin", _MED),
    ("Clarithromycin", _MED),
    ("Clindamycin", _MED),
    ("Vancomycin", _MED),
    ("Tetracycline", _MED),
    ("Doxycycline", _MED),
    ("Ciprofloxacin", _MED),
    ("Levofloxacin", _MED),
    ("Metronidazole", _MED),
    ("Nitrofurantoin", _MED),
    ("Aspirin", _MED),
    ("Ibuprofen", _MED),
    ("Naproxen", _MED),
    ("NSAIDs (general)", _MED),
    ("Acetaminophen", _MED),
    ("Codeine", _MED),
    ("Morphine", _MED),
    ("Hydrocodone", _MED),
    ("Oxycodone", _MED),
    ("Tramadol", _MED),
    ("Lisinopril", _MED),
    ("Enalapril", _MED),
    ("ACE inhibitors (general)", _MED),
    ("Losartan", _MED),
    ("Atorvastatin", _MED),
    ("Simvastatin", _MED),
    ("Statins (general)", _MED),
    ("Metformin", _MED),
    ("Insulin", _MED),
    ("Warfarin", _MED),
    ("Heparin", _MED),
    ("Lidocaine", _MED),
    ("Carbamazepine", _MED),
    ("Phenytoin", _MED),
    ("Lamotrigine", _MED),
    ("Allopurinol", _MED),
    ("Furosemide", _MED),
    ("Hydrochlorothiazide", _MED),
    # ── Food ─────────────────────────────────────────────────────────
    ("Peanuts", _FOOD),
    ("Tree nuts", _FOOD),
    ("Almonds", _FOOD),
    ("Cashews", _FOOD),
    ("Walnuts", _FOOD),
    ("Pecans", _FOOD),
    ("Pistachios", _FOOD),
    ("Hazelnuts", _FOOD),
    ("Brazil nuts", _FOOD),
    ("Macadamia nuts", _FOOD),
    ("Shellfish", _FOOD),
    ("Shrimp", _FOOD),
    ("Crab", _FOOD),
    ("Lobster", _FOOD),
    ("Fish", _FOOD),
    ("Cod", _FOOD),
    ("Salmon", _FOOD),
    ("Tuna", _FOOD),
    ("Eggs", _FOOD),
    ("Milk (cow)", _FOOD),
    ("Lactose intolerance", _FOOD),
    ("Soy", _FOOD),
    ("Wheat", _FOOD),
    ("Gluten", _FOOD),
    ("Sesame", _FOOD),
    ("Sulfites", _FOOD),
    ("MSG", _FOOD),
    ("Red dye 40", _FOOD),
    ("Strawberries", _FOOD),
    ("Tomatoes", _FOOD),
    ("Citrus", _FOOD),
    ("Avocado", _FOOD),
    ("Banana", _FOOD),
    ("Kiwi", _FOOD),
    # ── Environmental ────────────────────────────────────────────────
    ("Pollen (tree)", _ENV),
    ("Pollen (grass)", _ENV),
    ("Pollen (weed)", _ENV),
    ("Ragweed", _ENV),
    ("Dust mites", _ENV),
    ("Mold", _ENV),
    ("Pet dander (cat)", _ENV),
    ("Pet dander (dog)", _ENV),
    ("Cockroach", _ENV),
    ("Bee sting", _ENV),
    ("Wasp sting", _ENV),
    ("Yellow jacket sting", _ENV),
    ("Hornet sting", _ENV),
    ("Fire ant", _ENV),
    ("Mosquito bite (severe)", _ENV),
    ("Tobacco smoke", _ENV),
    ("Perfume / fragrance", _ENV),
    ("Cleaning chemicals", _ENV),
    # ── Latex ────────────────────────────────────────────────────────
    ("Natural rubber latex", _LATEX),
    ("Latex gloves", _LATEX),
    ("Latex balloons", _LATEX),
    # ── Contrast / imaging agents ────────────────────────────────────
    ("Iodinated contrast", _CONTRAST),
    ("Gadolinium-based contrast", _CONTRAST),
    ("Barium contrast", _CONTRAST),
    # ── Other ────────────────────────────────────────────────────────
    ("Adhesive / tape", _OTHER),
    ("Nickel", _OTHER),
    ("Hair dye", _OTHER),
    ("Sunscreen", _OTHER),
    ("Other (see notes)", _OTHER),
]


def get_catalog_entries():
    return [
        {"label": label, "category": category} for label, category in ALLERGEN_CATALOG
    ]
