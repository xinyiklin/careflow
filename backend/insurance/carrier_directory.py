"""
Seed list of common US health-insurance carriers for the app-scale
``InsuranceCarrier`` directory.

Each entry is (name, payer_id, phone_number, website). ``payer_id`` is the
synthetic identifier used as the idempotency key for the
``load_directories`` management command; real deployments would import
from a clearinghouse (Availity, Change Healthcare) payer list.
"""

CARRIER_DIRECTORY = [
    # name, payer_id, phone, website
    ("Aetna", "AETNA", "1-800-872-3862", "https://www.aetna.com"),
    (
        "Anthem Blue Cross Blue Shield",
        "ANTHM",
        "1-800-676-2583",
        "https://www.anthem.com",
    ),
    (
        "Blue Cross Blue Shield of Texas",
        "BCBSTX",
        "1-800-521-2227",
        "https://www.bcbstx.com",
    ),
    (
        "Blue Cross Blue Shield of Illinois",
        "BCBSIL",
        "1-800-538-8833",
        "https://www.bcbsil.com",
    ),
    (
        "Blue Cross Blue Shield of Florida",
        "BCBSFL",
        "1-800-352-2583",
        "https://www.floridablue.com",
    ),
    (
        "Blue Cross Blue Shield of California",
        "BCBSCA",
        "1-800-227-3641",
        "https://www.blueshieldca.com",
    ),
    (
        "Blue Cross Blue Shield of Massachusetts",
        "BCBSMA",
        "1-800-262-2583",
        "https://home.bluecrossma.com",
    ),
    (
        "Blue Cross Blue Shield of Michigan",
        "BCBSMI",
        "1-877-469-2583",
        "https://www.bcbsm.com",
    ),
    (
        "Blue Cross Blue Shield of New York",
        "BCBSNY",
        "1-800-261-5962",
        "https://www.empireblue.com",
    ),
    ("Cigna", "CIGNA", "1-800-244-6224", "https://www.cigna.com"),
    ("Humana", "HUMAN", "1-800-457-4708", "https://www.humana.com"),
    ("Kaiser Permanente", "KAISR", "1-800-464-4000", "https://www.kp.org"),
    ("UnitedHealthcare", "UHC", "1-866-633-2446", "https://www.uhc.com"),
    ("Optum", "OPTUM", "1-800-356-3477", "https://www.optum.com"),
    (
        "Molina Healthcare",
        "MOLNA",
        "1-888-665-4621",
        "https://www.molinahealthcare.com",
    ),
    ("Centene", "CENTN", "1-877-687-1196", "https://www.centene.com"),
    ("WellCare", "WELLC", "1-866-799-5318", "https://www.wellcare.com"),
    ("Health Net", "HNETC", "1-800-522-0088", "https://www.healthnet.com"),
    ("CareSource", "CARSRC", "1-800-488-0134", "https://www.caresource.com"),
    (
        "Geisinger Health Plan",
        "GEIS",
        "1-800-447-4000",
        "https://www.geisinger.org/health-plan",
    ),
    # ── Government payers ──────────────────────────────────────────
    ("Medicare", "MEDIC", "1-800-633-4227", "https://www.medicare.gov"),
    ("Medicaid (state-administered)", "MEDIA", "", "https://www.medicaid.gov"),
    ("Tricare", "TRICR", "1-800-444-5445", "https://www.tricare.mil"),
    ("VA (Veterans Affairs)", "VA", "1-877-222-8387", "https://www.va.gov/health-care"),
    (
        "CHAMPVA",
        "CHMVA",
        "1-800-733-8387",
        "https://www.va.gov/health-care/family-caregiver-benefits/champva",
    ),
    ("Indian Health Service", "IHS", "1-301-443-3593", "https://www.ihs.gov"),
    # ── Regional / smaller carriers ────────────────────────────────
    ("Independence Blue Cross", "IBC", "1-800-275-2583", "https://www.ibx.com"),
    ("Highmark", "HMARK", "1-800-345-3806", "https://www.highmark.com"),
    ("HCSC", "HCSC", "1-855-251-6261", "https://www.hcsc.com"),
    ("Premera Blue Cross", "PREMC", "1-800-722-1471", "https://www.premera.com"),
    ("Regence", "REGNC", "1-888-344-6347", "https://www.regence.com"),
    ("EmblemHealth", "EMBHL", "1-800-447-8255", "https://www.emblemhealth.com"),
    ("Healthfirst", "HFRST", "1-866-463-6743", "https://healthfirst.org"),
    ("Oscar Health", "OSCAR", "1-855-672-2755", "https://www.hioscar.com"),
    ("Bright Health", "BRGHT", "1-844-926-4524", "https://www.brighthealthcare.com"),
    ("Friday Health Plans", "FRIDY", "1-800-475-8466", "https://fridayhealthplans.com"),
    # ── Workers comp / auto / niche ────────────────────────────────
    ("Workers Compensation (default)", "WC", "", ""),
    ("Auto / Personal Injury Protection", "AUTO", "", ""),
    ("Self-Pay", "SELF", "", ""),
    ("Cash / Discount", "CASH", "", ""),
]
