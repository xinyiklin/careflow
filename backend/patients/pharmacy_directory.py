"""
Seed list of common retail and mail-order pharmacy chains for the
app-scale ``Pharmacy`` directory.

Each entry is (external_id, name, service_type, phone_number, website). The
``external_id`` is the idempotency key for the
``load_directories`` management command; ``service_type`` matches the
:class:`Pharmacy.SERVICE_TYPE_CHOICES` enum.

This catalog is not exhaustive and contains *generic chain entries* — real
deployments would import the NPPES/NCPDP directory; CareFlow uses these
synthetic rows to power patient-portal pharmacy search and clinician
preferred-pharmacy lookup.
"""

from .models import Pharmacy

_RETAIL = Pharmacy.SERVICE_RETAIL
_MAIL = Pharmacy.SERVICE_MAIL_ORDER
_SPECIALTY = Pharmacy.SERVICE_SPECIALTY
_LTC = Pharmacy.SERVICE_LTC

PHARMACY_DIRECTORY = [
    # external_id, name, service_type, phone, website
    (
        "directory:cvs-retail",
        "CVS Pharmacy",
        _RETAIL,
        "1-800-746-7287",
        "https://www.cvs.com",
    ),
    (
        "directory:walgreens-retail",
        "Walgreens",
        _RETAIL,
        "1-800-925-4733",
        "https://www.walgreens.com",
    ),
    (
        "directory:rite-aid-retail",
        "Rite Aid",
        _RETAIL,
        "1-800-748-3243",
        "https://www.riteaid.com",
    ),
    (
        "directory:walmart-retail",
        "Walmart Pharmacy",
        _RETAIL,
        "1-800-925-6278",
        "https://www.walmart.com/pharmacy",
    ),
    (
        "directory:costco-retail",
        "Costco Pharmacy",
        _RETAIL,
        "1-800-607-6861",
        "https://www.costco.com/pharmacy",
    ),
    (
        "directory:samsclub-retail",
        "Sam's Club Pharmacy",
        _RETAIL,
        "1-888-746-7726",
        "https://www.samsclub.com/pharmacy",
    ),
    (
        "directory:target-retail",
        "Target / CVS at Target",
        _RETAIL,
        "1-800-746-7287",
        "https://www.target.com/c/pharmacy",
    ),
    (
        "directory:kroger-retail",
        "Kroger Pharmacy",
        _RETAIL,
        "1-800-576-4377",
        "https://www.kroger.com/rx",
    ),
    (
        "directory:publix-retail",
        "Publix Pharmacy",
        _RETAIL,
        "1-800-242-1227",
        "https://www.publix.com/pharmacy",
    ),
    (
        "directory:safeway-retail",
        "Safeway Pharmacy",
        _RETAIL,
        "1-877-723-3929",
        "https://www.safeway.com/pharmacy.html",
    ),
    (
        "directory:albertsons-retail",
        "Albertsons Pharmacy",
        _RETAIL,
        "1-877-723-3929",
        "https://www.albertsons.com/pharmacy",
    ),
    (
        "directory:vons-retail",
        "Vons Pharmacy",
        _RETAIL,
        "1-877-723-3929",
        "https://www.vons.com",
    ),
    (
        "directory:giant-retail",
        "Giant Pharmacy",
        _RETAIL,
        "1-888-814-4268",
        "https://giantfood.com/pharmacy",
    ),
    (
        "directory:hannaford-retail",
        "Hannaford Pharmacy",
        _RETAIL,
        "1-800-213-9040",
        "https://www.hannaford.com/pharmacy",
    ),
    (
        "directory:wegmans-retail",
        "Wegmans Pharmacy",
        _RETAIL,
        "1-800-934-6267",
        "https://www.wegmans.com/pharmacy/",
    ),
    (
        "directory:heb-retail",
        "H-E-B Pharmacy",
        _RETAIL,
        "1-800-432-3113",
        "https://www.heb.com/pharmacy",
    ),
    (
        "directory:meijer-retail",
        "Meijer Pharmacy",
        _RETAIL,
        "1-877-363-4537",
        "https://www.meijer.com/pharmacy",
    ),
    (
        "directory:stop-shop-retail",
        "Stop & Shop Pharmacy",
        _RETAIL,
        "1-800-767-7772",
        "https://stopandshop.com/pharmacy",
    ),
    (
        "directory:winn-dixie-retail",
        "Winn-Dixie Pharmacy",
        _RETAIL,
        "1-866-946-6349",
        "https://www.winndixie.com/pharmacy",
    ),
    (
        "directory:harris-teeter-retail",
        "Harris Teeter Pharmacy",
        _RETAIL,
        "1-800-432-6111",
        "https://www.harristeeter.com/pharmacy",
    ),
    (
        "directory:fred-meyer-retail",
        "Fred Meyer Pharmacy",
        _RETAIL,
        "1-866-211-5454",
        "https://www.fredmeyer.com/rx",
    ),
    (
        "directory:longs-retail",
        "Longs Drugs",
        _RETAIL,
        "1-800-746-7287",
        "https://www.cvs.com",
    ),
    (
        "directory:duane-reade-retail",
        "Duane Reade",
        _RETAIL,
        "1-800-925-4733",
        "https://www.walgreens.com",
    ),
    # ── Mail order / specialty ──────────────────────────────────────
    (
        "directory:express-scripts-mail",
        "Express Scripts",
        _MAIL,
        "1-800-282-2881",
        "https://www.express-scripts.com",
    ),
    (
        "directory:caremark-mail",
        "CVS Caremark Mail Service",
        _MAIL,
        "1-800-552-8159",
        "https://www.caremark.com",
    ),
    (
        "directory:optum-mail",
        "OptumRx Home Delivery",
        _MAIL,
        "1-800-356-3477",
        "https://www.optumrx.com",
    ),
    (
        "directory:humana-mail",
        "Humana Pharmacy Mail Order",
        _MAIL,
        "1-800-379-0092",
        "https://www.humanapharmacy.com",
    ),
    (
        "directory:amazon-pharmacy-mail",
        "Amazon Pharmacy",
        _MAIL,
        "1-855-745-5725",
        "https://pharmacy.amazon.com",
    ),
    (
        "directory:accredo-specialty",
        "Accredo Specialty Pharmacy",
        _SPECIALTY,
        "1-800-803-2523",
        "https://www.accredo.com",
    ),
    (
        "directory:cvs-specialty",
        "CVS Specialty",
        _SPECIALTY,
        "1-800-237-2767",
        "https://www.cvsspecialty.com",
    ),
]
