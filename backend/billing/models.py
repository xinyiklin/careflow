from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from clinical.models import Encounter


class EncounterBillingRecord(models.Model):
    STATUS_CODING_NEEDED = "coding_needed"
    STATUS_READY_TO_SUBMIT = "ready_to_submit"
    STATUS_CLAIM_CREATED = "claim_created"

    STATUS_CHOICES = [
        (STATUS_CODING_NEEDED, "Coding Needed"),
        (STATUS_READY_TO_SUBMIT, "Ready to Submit"),
        (STATUS_CLAIM_CREATED, "Claim Created"),
    ]

    encounter = models.OneToOneField(
        "clinical.Encounter",
        on_delete=models.CASCADE,
        related_name="billing_record",
    )
    facility = models.ForeignKey(
        "facilities.Facility",
        on_delete=models.CASCADE,
        related_name="encounter_billing_records",
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.PROTECT,
        related_name="encounter_billing_records",
    )
    status = models.CharField(
        max_length=32,
        choices=STATUS_CHOICES,
        default=STATUS_CODING_NEEDED,
    )
    payer_name = models.CharField(max_length=150, blank=True)
    place_of_service = models.CharField(max_length=2, default="11", blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_billing_records",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_billing_records",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-created_at"]
        indexes = [
            models.Index(fields=["facility", "patient", "-updated_at"]),
            models.Index(fields=["facility", "status", "-updated_at"]),
        ]

    def clean(self):
        if not self.encounter_id:
            return

        if self.encounter.status != Encounter.STATUS_SIGNED:
            raise ValidationError(
                {"encounter": "Only signed encounters can be sent to billing."}
            )

        if self.facility_id and self.facility_id != self.encounter.facility_id:
            raise ValidationError(
                {"facility": "Billing facility must match encounter facility."}
            )

        if self.patient_id and self.patient_id != self.encounter.patient_id:
            raise ValidationError(
                {"patient": "Billing patient must match encounter patient."}
            )

    def save(self, *args, **kwargs):
        if self.encounter_id:
            self.facility_id = self.encounter.facility_id
            self.patient_id = self.encounter.patient_id
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def total_charge_amount(self):
        total = Decimal("0.00")
        for line in self.charge_lines.all():
            total += (line.charge_amount or Decimal("0.00")) * (
                line.units or Decimal("0.00")
            )
        return total.quantize(Decimal("0.01"))

    def __str__(self):
        return f"Billing record {self.pk} for encounter {self.encounter_id}"


class EncounterDiagnosis(models.Model):
    billing_record = models.ForeignKey(
        EncounterBillingRecord,
        on_delete=models.CASCADE,
        related_name="diagnoses",
    )
    code = models.CharField(max_length=12)
    description = models.CharField(max_length=255, blank=True)
    sequence = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ["sequence", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["billing_record", "sequence"],
                name="unique_billing_diagnosis_sequence",
            ),
        ]

    def clean(self):
        self.code = (self.code or "").strip().upper()
        self.description = (self.description or "").strip()
        if not self.code:
            raise ValidationError({"code": "Diagnosis code is required."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.code


class EncounterChargeLine(models.Model):
    billing_record = models.ForeignKey(
        EncounterBillingRecord,
        on_delete=models.CASCADE,
        related_name="charge_lines",
    )
    service_code = models.CharField(max_length=16)
    description = models.CharField(max_length=255, blank=True)
    modifier_1 = models.CharField(max_length=2, blank=True)
    modifier_2 = models.CharField(max_length=2, blank=True)
    modifier_3 = models.CharField(max_length=2, blank=True)
    modifier_4 = models.CharField(max_length=2, blank=True)
    units = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("1.00"))
    charge_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    diagnosis_pointers = models.JSONField(default=list, blank=True)
    sequence = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ["sequence", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["billing_record", "sequence"],
                name="unique_billing_charge_line_sequence",
            ),
        ]

    def clean(self):
        self.service_code = (self.service_code or "").strip().upper()
        self.description = (self.description or "").strip()
        self.modifier_1 = (self.modifier_1 or "").strip().upper()
        self.modifier_2 = (self.modifier_2 or "").strip().upper()
        self.modifier_3 = (self.modifier_3 or "").strip().upper()
        self.modifier_4 = (self.modifier_4 or "").strip().upper()

        if not self.service_code:
            raise ValidationError({"service_code": "Service code is required."})
        if self.units <= 0:
            raise ValidationError({"units": "Units must be greater than zero."})
        if self.charge_amount < 0:
            raise ValidationError(
                {"charge_amount": "Charge amount cannot be negative."}
            )
        if not isinstance(self.diagnosis_pointers, list):
            raise ValidationError(
                {"diagnosis_pointers": "Diagnosis pointers must be a list."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def line_total(self):
        return (
            (self.charge_amount or Decimal("0.00")) * (self.units or Decimal("0.00"))
        ).quantize(Decimal("0.01"))

    def __str__(self):
        return self.service_code


class OrganizationFeeSchedule(models.Model):
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="fee_schedules",
    )
    facility = models.ForeignKey(
        "facilities.Facility",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="facility_fee_schedules",
    )
    source_schedule = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="derived_schedules",
    )
    name = models.CharField(max_length=120)
    code = models.SlugField(max_length=64)
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_organization_fee_schedules",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_organization_fee_schedules",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "name", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "code"],
                condition=Q(facility__isnull=True),
                name="unique_org_fee_schedule_code",
            ),
            models.UniqueConstraint(
                fields=["facility", "code"],
                condition=Q(facility__isnull=False),
                name="unique_facility_fee_schedule_code",
            ),
            models.UniqueConstraint(
                fields=["organization"],
                condition=Q(is_default=True, facility__isnull=True),
                name="unique_org_default_fee_schedule",
            ),
            models.UniqueConstraint(
                fields=["facility"],
                condition=Q(is_default=True, facility__isnull=False),
                name="unique_facility_default_fee_schedule",
            ),
        ]
        indexes = [
            models.Index(fields=["organization", "is_active"]),
            models.Index(fields=["facility", "is_active"]),
        ]

    @classmethod
    def get_default_for_organization(cls, organization, user=None):
        # get_or_create is race-safe: a concurrent first-write loses the unique
        # constraint, is caught internally, and re-reads the winner's row
        # instead of surfacing an IntegrityError as a 500.
        schedule, _ = cls.objects.get_or_create(
            organization=organization,
            facility=None,
            is_default=True,
            defaults={
                "name": "Standard Fee Schedule",
                "code": "standard",
                "created_by": user,
                "updated_by": user,
            },
        )
        return schedule

    @property
    def is_facility_schedule(self):
        return self.facility_id is not None

    def clean(self):
        self.name = (self.name or "").strip()
        self.code = (self.code or "").strip().lower().replace(" ", "-")
        self.notes = (self.notes or "").strip()

        if not self.name:
            raise ValidationError({"name": "Fee schedule name is required."})
        if not self.code:
            raise ValidationError({"code": "Fee schedule code is required."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        prefix = f"[{self.facility}] " if self.facility_id else ""
        return f"{prefix}{self.name}"


class OrganizationFeeScheduleItem(models.Model):
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="fee_schedule_items",
    )
    schedule = models.ForeignKey(
        OrganizationFeeSchedule,
        on_delete=models.CASCADE,
        related_name="items",
        null=True,
        blank=True,
    )
    service_code = models.CharField(max_length=16)
    description = models.CharField(max_length=255)
    default_units = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=Decimal("1.00"),
    )
    charge_amount = models.DecimalField(max_digits=10, decimal_places=2)
    modifier_1 = models.CharField(max_length=2, blank=True)
    modifier_2 = models.CharField(max_length=2, blank=True)
    modifier_3 = models.CharField(max_length=2, blank=True)
    modifier_4 = models.CharField(max_length=2, blank=True)
    place_of_service = models.CharField(max_length=2, default="11", blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_organization_fee_schedule_items",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_organization_fee_schedule_items",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "service_code", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["schedule", "service_code"],
                condition=Q(schedule__isnull=False),
                name="unique_fee_schedule_sheet_service_code",
            ),
            models.UniqueConstraint(
                fields=["organization", "service_code"],
                condition=Q(schedule__isnull=True),
                name="unique_org_fee_schedule_legacy_service_code",
            ),
        ]
        indexes = [
            models.Index(fields=["organization", "is_active", "service_code"]),
            models.Index(fields=["schedule", "is_active", "service_code"]),
        ]

    def clean(self):
        self.service_code = (self.service_code or "").strip().upper()
        self.description = (self.description or "").strip()
        self.modifier_1 = (self.modifier_1 or "").strip().upper()
        self.modifier_2 = (self.modifier_2 or "").strip().upper()
        self.modifier_3 = (self.modifier_3 or "").strip().upper()
        self.modifier_4 = (self.modifier_4 or "").strip().upper()
        self.place_of_service = (self.place_of_service or "").strip()

        if not self.service_code:
            raise ValidationError({"service_code": "Service code is required."})
        if not self.description:
            raise ValidationError({"description": "Description is required."})
        if self.schedule_id and self.schedule.organization_id != self.organization_id:
            raise ValidationError(
                {"schedule": "Fee schedule must belong to this organization."}
            )
        if self.default_units <= 0:
            raise ValidationError(
                {"default_units": "Default units must be greater than zero."}
            )
        if self.charge_amount < 0:
            raise ValidationError(
                {"charge_amount": "Charge amount cannot be negative."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.service_code} - {self.description}"


class FacilityFeeScheduleOverride(models.Model):
    facility = models.ForeignKey(
        "facilities.Facility",
        on_delete=models.CASCADE,
        related_name="fee_schedule_overrides",
    )
    organization_item = models.ForeignKey(
        OrganizationFeeScheduleItem,
        on_delete=models.CASCADE,
        related_name="facility_overrides",
        null=True,
        blank=True,
    )
    service_code = models.CharField(max_length=16, blank=True)
    description = models.CharField(max_length=255, blank=True)
    default_units = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
    )
    charge_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    modifier_1 = models.CharField(max_length=2, blank=True)
    modifier_2 = models.CharField(max_length=2, blank=True)
    modifier_3 = models.CharField(max_length=2, blank=True)
    modifier_4 = models.CharField(max_length=2, blank=True)
    place_of_service = models.CharField(max_length=2, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_facility_fee_schedule_overrides",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_facility_fee_schedule_overrides",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = [
            "sort_order",
            "service_code",
            "organization_item__service_code",
            "id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["facility", "organization_item"],
                name="unique_facility_fee_schedule_org_override",
            ),
            models.UniqueConstraint(
                fields=["facility", "service_code"],
                condition=Q(organization_item__isnull=True),
                name="unique_facility_local_fee_schedule_code",
            ),
        ]
        indexes = [
            models.Index(fields=["facility", "is_active", "service_code"]),
        ]

    def clean(self):
        is_org_override = bool(self.organization_item_id)
        self.service_code = (self.service_code or "").strip().upper()
        self.description = (self.description or "").strip()
        self.modifier_1 = (self.modifier_1 or "").strip().upper()
        self.modifier_2 = (self.modifier_2 or "").strip().upper()
        self.modifier_3 = (self.modifier_3 or "").strip().upper()
        self.modifier_4 = (self.modifier_4 or "").strip().upper()
        self.place_of_service = (self.place_of_service or "").strip()

        if is_org_override and self.service_code:
            raise ValidationError(
                {"service_code": "Inherited fee schedule codes cannot be changed."}
            )
        if (
            is_org_override
            and self.facility_id
            and self.organization_item.organization_id != self.facility.organization_id
        ):
            raise ValidationError(
                "Fee schedule override must belong to the facility organization."
            )
        if not is_org_override and not self.service_code:
            raise ValidationError({"service_code": "Service code is required."})
        if not is_org_override and not self.description:
            raise ValidationError({"description": "Description is required."})
        if not is_org_override and self.charge_amount is None:
            raise ValidationError({"charge_amount": "Charge amount is required."})
        if self.default_units is not None and self.default_units <= 0:
            raise ValidationError(
                {"default_units": "Default units must be greater than zero."}
            )
        if self.charge_amount is not None and self.charge_amount < 0:
            raise ValidationError(
                {"charge_amount": "Charge amount cannot be negative."}
            )

    @property
    def effective_service_code(self):
        return (
            self.organization_item.service_code
            if self.organization_item_id
            else self.service_code
        )

    @property
    def effective_description(self):
        if self.description:
            return self.description
        return self.organization_item.description if self.organization_item_id else ""

    @property
    def effective_default_units(self):
        if self.default_units is not None:
            return self.default_units
        if self.organization_item_id:
            return self.organization_item.default_units
        return Decimal("1.00")

    @property
    def effective_charge_amount(self):
        if self.charge_amount is not None:
            return self.charge_amount
        if self.organization_item_id:
            return self.organization_item.charge_amount
        return Decimal("0.00")

    @property
    def effective_place_of_service(self):
        return self.place_of_service or (
            self.organization_item.place_of_service if self.organization_item_id else ""
        )

    def get_effective_modifier(self, field_name):
        value = getattr(self, field_name)
        if value:
            return value
        if self.organization_item_id:
            return getattr(self.organization_item, field_name)
        return ""

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.facility} fee schedule {self.effective_service_code}"
