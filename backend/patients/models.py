from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models, transaction
from django.db.models import Q
from django.utils.text import slugify

from facilities.models import Facility


def validate_phone_number(value):
    raw = str(value or "").strip()
    if not raw:
        return
    if not all(char.isdigit() or char in "()+.- " for char in raw):
        raise ValidationError("Enter a valid phone number.")

    digits = "".join(char for char in raw if char.isdigit())
    if len(digits) == 10:
        return
    if len(digits) == 11 and digits.startswith("1"):
        return
    raise ValidationError(
        "Phone number must be 10 digits, or 11 digits starting with 1."
    )


phone_validator = validate_phone_number

npi_validator = RegexValidator(
    regex=r"^\d{10}$",
    message="NPI must be 10 digits.",
)

ncpdp_validator = RegexValidator(
    regex=r"^\d{7}$",
    message="NCPDP ID must be 7 digits.",
)

dea_validator = RegexValidator(
    regex=r"^[A-Za-z]{2}\d{7}$",
    message="DEA number must use 2 letters followed by 7 digits.",
)

ssn_validator = RegexValidator(
    regex=r"^\d{9}$",
    message="SSN must be exactly 9 digits.",
)

ssn_last4_validator = RegexValidator(
    regex=r"^\d{4}$",
    message="SSN last 4 must be exactly 4 digits.",
)

chart_number_validator = RegexValidator(
    regex=r"^\d+$",
    message="MRN must contain digits only.",
)

CHART_NUMBER_START = 100
CHART_NUMBER_STEP = 10

DEFAULT_DOCUMENT_CATEGORIES = [
    {"code": "clinical", "name": "Clinical Notes", "sort_order": 10},
    {"code": "lab", "name": "Lab Reports", "sort_order": 20, "is_system": True},
    {
        "code": "imaging",
        "name": "Radiology & Imaging",
        "sort_order": 30,
        "is_system": True,
    },
    {"code": "referrals", "name": "Referrals & Consults", "sort_order": 40},
    {"code": "insurance", "name": "Insurance & Benefits", "sort_order": 50},
    {"code": "admin", "name": "Administrative", "sort_order": 60, "is_system": True},
    {"code": "consent", "name": "Consent Forms", "sort_order": 70, "is_system": True},
]


def get_next_chart_number(facility_id, exclude_patient_id=None):
    queryset = Patient.objects.filter(facility_id=facility_id)
    if exclude_patient_id:
        queryset = queryset.exclude(pk=exclude_patient_id)

    highest_chart_number = CHART_NUMBER_START - CHART_NUMBER_STEP
    for chart_number in queryset.values_list("chart_number", flat=True).iterator():
        normalized = str(chart_number or "").strip()
        if normalized.isdigit():
            highest_chart_number = max(highest_chart_number, int(normalized))

    return str(highest_chart_number + CHART_NUMBER_STEP)


class PatientPhone(models.Model):
    PHONE_TYPES = [
        ("cell", "Cell"),
        ("home", "Home"),
        ("work", "Work"),
    ]

    patient = models.ForeignKey(
        "Patient",
        on_delete=models.CASCADE,
        related_name="phones",
    )
    number = models.CharField(max_length=20, validators=[phone_validator])
    label = models.CharField(max_length=10, choices=PHONE_TYPES, default="cell")
    is_primary = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.get_label_display()}: {self.number}"


class PatientDocument(models.Model):
    CATEGORY_CLINICAL = "clinical"
    CATEGORY_LAB = "lab"
    CATEGORY_IMAGING = "imaging"
    CATEGORY_REFERRALS = "referrals"
    CATEGORY_INSURANCE = "insurance"
    CATEGORY_ADMIN = "admin"
    CATEGORY_CONSENT = "consent"

    CATEGORY_CHOICES = [
        (CATEGORY_CLINICAL, "Clinical Notes"),
        (CATEGORY_LAB, "Lab Reports"),
        (CATEGORY_IMAGING, "Radiology & Imaging"),
        (CATEGORY_REFERRALS, "Referrals & Consults"),
        (CATEGORY_INSURANCE, "Insurance & Benefits"),
        (CATEGORY_ADMIN, "Administrative"),
        (CATEGORY_CONSENT, "Consent Forms"),
    ]

    patient = models.ForeignKey(
        "Patient",
        on_delete=models.CASCADE,
        related_name="patient_documents",
    )
    name = models.CharField(max_length=255)
    category = models.CharField(
        max_length=30,
        default=CATEGORY_ADMIN,
    )
    document_date = models.DateField(null=True, blank=True)
    uploaded_by_name = models.CharField(max_length=150, blank=True)
    file_size_display = models.CharField(max_length=40, blank=True)
    file_size_bytes = models.PositiveBigIntegerField(default=0)
    content_type = models.CharField(max_length=120, blank=True)
    original_filename = models.CharField(max_length=255, blank=True)
    storage_key = models.CharField(max_length=500, blank=True)
    file_url = models.URLField(blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-document_date", "-created_at", "name"]

    def __str__(self):
        return f"{self.name} - {self.patient}"


class PatientDocumentCategory(models.Model):
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="document_categories",
    )
    code = models.SlugField(max_length=30)
    name = models.CharField(max_length=80)
    sort_order = models.PositiveIntegerField(default=0)
    is_system = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "name"]
        unique_together = ("facility", "code")
        verbose_name_plural = "Patient document categories"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = slugify(self.name)[:30]
        self.code = slugify(self.code)[:30]
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


def ensure_default_document_categories(facility):
    if not facility:
        return []

    for category in DEFAULT_DOCUMENT_CATEGORIES:
        PatientDocumentCategory.objects.get_or_create(
            facility=facility,
            code=category["code"],
            defaults={
                "name": category["name"],
                "sort_order": category["sort_order"],
                "is_system": category.get("is_system", False),
                "is_active": True,
            },
        )

    return list(
        PatientDocumentCategory.objects.filter(
            facility=facility,
            is_active=True,
        ).order_by("sort_order", "name")
    )


class Pharmacy(models.Model):
    SOURCE_CUSTOM = "custom"
    SOURCE_IMPORTED = "imported"
    SOURCE_DIRECTORY = "directory"

    SOURCE_CHOICES = [
        (SOURCE_CUSTOM, "Custom"),
        (SOURCE_IMPORTED, "Imported"),
        (SOURCE_DIRECTORY, "Directory"),
    ]

    SERVICE_RETAIL = "retail"
    SERVICE_MAIL_ORDER = "mail_order"
    SERVICE_SPECIALTY = "specialty"
    SERVICE_LTC = "ltc"
    SERVICE_DME = "dme"
    SERVICE_HOME_INFUSION = "home_infusion"
    SERVICE_OTHER = "other"

    SERVICE_TYPE_CHOICES = [
        (SERVICE_RETAIL, "Retail"),
        (SERVICE_MAIL_ORDER, "Mail Order"),
        (SERVICE_SPECIALTY, "Specialty"),
        (SERVICE_LTC, "Long-Term Care"),
        (SERVICE_DME, "DME"),
        (SERVICE_HOME_INFUSION, "Home Infusion"),
        (SERVICE_OTHER, "Other"),
    ]

    DIRECTORY_STATUS_ACTIVE = "active"
    DIRECTORY_STATUS_INACTIVE = "inactive"
    DIRECTORY_STATUS_UNKNOWN = "unknown"

    DIRECTORY_STATUS_CHOICES = [
        (DIRECTORY_STATUS_ACTIVE, "Active"),
        (DIRECTORY_STATUS_INACTIVE, "Inactive"),
        (DIRECTORY_STATUS_UNKNOWN, "Unknown"),
    ]

    name = models.CharField(max_length=150)
    legal_business_name = models.CharField(max_length=255, blank=True)
    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default=SOURCE_CUSTOM,
    )
    external_id = models.CharField(max_length=100, blank=True)
    ncpdp_id = models.CharField(
        max_length=7,
        blank=True,
        null=True,
        unique=True,
        validators=[ncpdp_validator],
    )
    npi = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        unique=True,
        validators=[npi_validator],
    )
    dea_number = models.CharField(
        max_length=9,
        blank=True,
        validators=[dea_validator],
    )
    tax_id = models.CharField(max_length=20, blank=True)
    store_number = models.CharField(max_length=50, blank=True)
    service_type = models.CharField(
        max_length=30,
        choices=SERVICE_TYPE_CHOICES,
        default=SERVICE_RETAIL,
    )
    accepts_erx = models.BooleanField(default=False)
    is_24_hour = models.BooleanField(default=False)
    hours = models.JSONField(blank=True, default=dict)
    languages = models.JSONField(blank=True, default=list)
    directory_source = models.CharField(max_length=50, blank=True)
    directory_status = models.CharField(
        max_length=20,
        choices=DIRECTORY_STATUS_CHOICES,
        default=DIRECTORY_STATUS_UNKNOWN,
    )
    last_directory_sync_at = models.DateTimeField(null=True, blank=True)
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        validators=[phone_validator],
    )
    fax_number = models.CharField(
        max_length=20,
        blank=True,
        validators=[phone_validator],
    )
    address = models.OneToOneField(
        "shared.Address",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pharmacy",
    )
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "Pharmacies"

    def __str__(self):
        return self.name


class PatientPharmacy(models.Model):
    patient = models.ForeignKey(
        "Patient",
        on_delete=models.CASCADE,
        related_name="pharmacy_preferences",
    )
    pharmacy = models.ForeignKey(
        Pharmacy,
        on_delete=models.PROTECT,
        related_name="patient_preferences",
    )
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_default", "pharmacy__name"]
        unique_together = ("patient", "pharmacy")
        constraints = [
            models.UniqueConstraint(
                fields=["patient"],
                condition=Q(is_default=True, is_active=True),
                name="unique_active_default_patient_pharmacy",
            )
        ]

    def clean(self):
        if not self.patient_id or not self.pharmacy_id:
            return

        from organizations.models import OrganizationPharmacyPreference

        has_organization_access = OrganizationPharmacyPreference.objects.filter(
            organization_id=self.patient.facility.organization_id,
            pharmacy_id=self.pharmacy_id,
            is_active=True,
            is_hidden=False,
            pharmacy__is_active=True,
        ).exists()

        if not has_organization_access:
            raise ValidationError(
                {"pharmacy": "Pharmacy must be enabled for this organization."}
            )

    def save(self, *args, **kwargs):
        if self.is_default and self.is_active and self.patient_id:
            PatientPharmacy.objects.filter(
                patient_id=self.patient_id,
                is_default=True,
                is_active=True,
            ).exclude(pk=self.pk).update(is_default=False)

        self.full_clean()
        super().save(*args, **kwargs)

        if self.is_default and self.is_active:
            Patient.objects.filter(pk=self.patient_id).update(
                preferred_pharmacy_id=self.pharmacy_id
            )

    def __str__(self):
        return f"{self.patient} - {self.pharmacy}"


class CareProvider(models.Model):
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="care_providers",
    )
    linked_staff = models.ForeignKey(
        "facilities.Staff",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="provider_profiles",
    )
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    organization_name = models.CharField(max_length=150, blank=True)
    specialty = models.CharField(max_length=100, blank=True)
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        validators=[phone_validator],
    )
    fax_number = models.CharField(
        max_length=20,
        blank=True,
        validators=[phone_validator],
    )
    npi = models.CharField(
        max_length=10,
        blank=True,
        validators=[npi_validator],
    )
    address = models.OneToOneField(
        "shared.Address",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="care_provider",
    )
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["last_name", "first_name", "organization_name"]

    def clean(self):
        if self.linked_staff and self.linked_staff.facility_id != self.facility_id:
            raise ValidationError(
                {"linked_staff": "Linked staff must belong to the same facility."}
            )

        if not self.linked_staff and not (
            self.first_name or self.last_name or self.organization_name
        ):
            raise ValidationError(
                "Provide a linked staff member or external provider name/organization."
            )

    @property
    def display_name(self):
        if self.linked_staff:
            return str(self.linked_staff)

        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name or self.organization_name

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.display_name


class PatientEmergencyContact(models.Model):
    patient = models.ForeignKey(
        "Patient",
        on_delete=models.CASCADE,
        related_name="emergency_contacts",
    )
    name = models.CharField(max_length=150)
    relationship = models.CharField(max_length=100, blank=True)
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        validators=[phone_validator],
    )
    is_primary = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_primary", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["patient"],
                condition=Q(is_primary=True),
                name="unique_primary_emergency_contact",
            )
        ]

    def save(self, *args, **kwargs):
        if self.is_primary and self.patient_id:
            PatientEmergencyContact.objects.filter(
                patient_id=self.patient_id,
                is_primary=True,
            ).exclude(pk=self.pk).update(is_primary=False)

        self.full_clean()
        super().save(*args, **kwargs)

        if self.is_primary:
            Patient.objects.filter(pk=self.patient_id).update(
                emergency_contact_name=self.name,
                emergency_contact_relationship=self.relationship,
                emergency_contact_phone=self.phone_number,
            )

    def __str__(self):
        return f"{self.patient} - {self.name}"


class Patient(models.Model):
    RACE_CHOICES = [
        ("american_indian_or_alaska_native", "American Indian or Alaska Native"),
        ("asian", "Asian"),
        ("black_or_african_american", "Black or African American"),
        (
            "native_hawaiian_or_other_pacific_islander",
            "Native Hawaiian or Other Pacific Islander",
        ),
        ("white", "White"),
        ("other", "Other"),
        ("unknown", "Unknown"),
    ]
    ETHNICITY_CHOICES = [
        ("hispanic_or_latino", "Hispanic or Latino"),
        ("not_hispanic_or_latino", "Not Hispanic or Latino"),
        ("unknown", "Unknown"),
    ]
    SEX_AT_BIRTH_CHOICES = [
        ("female", "Female"),
        ("male", "Male"),
        ("intersex", "Intersex"),
        ("unknown", "Unknown"),
        ("undisclosed", "Undisclosed"),
    ]

    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="patients",
    )
    middle_name = models.CharField(max_length=100, blank=True)
    preferred_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100)
    first_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    gender = models.ForeignKey(
        "facilities.PatientGender",
        on_delete=models.PROTECT,
        related_name="patients",
    )
    sex_at_birth = models.CharField(
        max_length=20,
        choices=SEX_AT_BIRTH_CHOICES,
        blank=True,
    )
    race = models.CharField(max_length=60, choices=RACE_CHOICES, blank=True)
    race_declined = models.BooleanField(default=False)
    ethnicity = models.CharField(max_length=40, choices=ETHNICITY_CHOICES, blank=True)
    ethnicity_declined = models.BooleanField(default=False)
    preferred_language = models.CharField(max_length=50, blank=True)
    preferred_language_declined = models.BooleanField(default=False)
    pronouns = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    emergency_contact_name = models.CharField(max_length=150, blank=True)
    emergency_contact_relationship = models.CharField(max_length=100, blank=True)
    emergency_contact_phone = models.CharField(
        max_length=20,
        blank=True,
        validators=[phone_validator],
    )
    ssn = models.CharField(
        max_length=9,
        blank=True,
        validators=[ssn_validator],
        help_text="Full SSN. Display masked by default in the application.",
    )
    ssn_last4 = models.CharField(
        max_length=4,
        blank=True,
        validators=[ssn_last4_validator],
        help_text="Derived from SSN when available; retained for legacy display.",
    )

    chart_number = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        validators=[chart_number_validator],
    )
    pcp = models.ForeignKey(
        CareProvider,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="primary_care_patients",
    )
    referring_provider = models.ForeignKey(
        CareProvider,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="referred_patients",
    )
    preferred_pharmacy = models.ForeignKey(
        Pharmacy,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="patients",
    )

    address = models.OneToOneField(
        "shared.Address",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="patient",
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("facility", "first_name", "last_name", "date_of_birth")
        ordering = ["last_name", "first_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["facility", "chart_number"],
                condition=~Q(chart_number__isnull=True) & ~Q(chart_number=""),
                name="unique_patient_chart_number_per_facility",
            )
        ]

    def clean(self):
        if self.chart_number is not None:
            self.chart_number = str(self.chart_number).strip()

        if self.gender and self.gender.facility_id != self.facility_id:
            raise ValidationError(
                {"gender": "Patient gender must belong to the same facility."}
            )

        if self.pcp and self.pcp.facility_id != self.facility_id:
            raise ValidationError(
                {"pcp": "Primary care provider must belong to the same facility."}
            )

        if (
            self.referring_provider
            and self.referring_provider.facility_id != self.facility_id
        ):
            raise ValidationError(
                {
                    "referring_provider": (
                        "Referring provider must belong to the same facility."
                    )
                }
            )

        if self.preferred_pharmacy_id:
            from organizations.models import OrganizationPharmacyPreference

            has_organization_access = OrganizationPharmacyPreference.objects.filter(
                organization_id=self.facility.organization_id,
                pharmacy_id=self.preferred_pharmacy_id,
                is_active=True,
                is_hidden=False,
                pharmacy__is_active=True,
            ).exists()

            if not has_organization_access:
                raise ValidationError(
                    {
                        "preferred_pharmacy": (
                            "Preferred pharmacy must be enabled for this organization."
                        )
                    }
                )

        if self.preferred_pharmacy and not self.preferred_pharmacy.is_active:
            raise ValidationError(
                {"preferred_pharmacy": "Preferred pharmacy must be active."}
            )

    def save(self, *args, **kwargs):
        if self.chart_number is not None:
            self.chart_number = str(self.chart_number).strip()

        if self.chart_number or not self.facility_id:
            if self.ssn:
                self.ssn_last4 = self.ssn[-4:]
            self.full_clean()
            super().save(*args, **kwargs)
            return

        with transaction.atomic():
            Facility.objects.select_for_update().get(pk=self.facility_id)
            self.chart_number = get_next_chart_number(
                self.facility_id,
                exclude_patient_id=self.pk,
            )
            update_fields = kwargs.get("update_fields")
            if update_fields is not None:
                kwargs["update_fields"] = set(update_fields) | {"chart_number"}
            if self.ssn:
                self.ssn_last4 = self.ssn[-4:]
            self.full_clean()
            super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.last_name}, {self.first_name}"
