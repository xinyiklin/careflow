from django.db import models, transaction


class InsuranceCarrier(models.Model):
    SOURCE_CUSTOM = "custom"
    SOURCE_IMPORTED = "imported"
    SOURCE_DIRECTORY = "directory"
    SOURCE_CHOICES = [
        (SOURCE_CUSTOM, "Custom"),
        (SOURCE_IMPORTED, "Imported"),
        (SOURCE_DIRECTORY, "Directory"),
    ]

    name = models.CharField(max_length=150)
    owning_organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="private_insurance_carriers",
        null=True,
        blank=True,
    )
    owning_facility = models.ForeignKey(
        "facilities.Facility",
        on_delete=models.CASCADE,
        related_name="private_insurance_carriers",
        null=True,
        blank=True,
    )
    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default=SOURCE_DIRECTORY,
    )
    external_id = models.CharField(max_length=100, blank=True)
    directory_source = models.CharField(max_length=50, blank=True)
    last_directory_sync_at = models.DateTimeField(null=True, blank=True)
    payer_id = models.CharField(max_length=50, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True)
    address_line_1 = models.CharField(max_length=150, blank=True)
    address_line_2 = models.CharField(max_length=150, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=2, blank=True)
    zip_code = models.CharField(max_length=10, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.CheckConstraint(
                check=~models.Q(
                    owning_organization__isnull=False,
                    owning_facility__isnull=False,
                ),
                name="carrier_has_at_most_one_tenant_owner",
            ),
            models.UniqueConstraint(
                fields=["directory_source", "external_id"],
                condition=~models.Q(external_id=""),
                name="unique_carrier_external_directory_id",
            ),
        ]

    @property
    def ownership_scope(self):
        if self.owning_facility_id:
            return "facility"
        if self.owning_organization_id:
            return "organization"
        return "global"

    def __str__(self):
        return self.name


class OrganizationInsuranceCarrierPreference(models.Model):
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="insurance_carrier_preferences",
    )
    carrier = models.ForeignKey(
        InsuranceCarrier,
        on_delete=models.CASCADE,
        related_name="organization_preferences",
    )
    is_preferred = models.BooleanField(default=True)
    is_hidden = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    fee_schedule = models.ForeignKey(
        "billing.OrganizationFeeSchedule",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="linked_payer_preferences",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "carrier__name"]
        unique_together = ("organization", "carrier")

    def __str__(self):
        return f"{self.organization} preference for {self.carrier}"


class FacilityInsuranceCarrierOverride(models.Model):
    facility = models.ForeignKey(
        "facilities.Facility",
        on_delete=models.CASCADE,
        related_name="insurance_carrier_overrides",
    )
    organization_preference = models.ForeignKey(
        OrganizationInsuranceCarrierPreference,
        on_delete=models.CASCADE,
        related_name="facility_overrides",
        null=True,
        blank=True,
    )
    carrier = models.ForeignKey(
        InsuranceCarrier,
        on_delete=models.CASCADE,
        related_name="facility_overrides",
        null=True,
        blank=True,
    )
    is_preferred = models.BooleanField(default=True)
    is_hidden = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = [
            "sort_order",
            "carrier__name",
            "organization_preference__carrier__name",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["facility", "organization_preference"],
                name="unique_facility_payer_org_override",
            ),
            models.UniqueConstraint(
                fields=["facility", "carrier"],
                name="unique_facility_local_payer_override",
            ),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError

        if bool(self.organization_preference_id) == bool(self.carrier_id):
            raise ValidationError(
                "Provide either an organization preference or a local payer."
            )
        if (
            self.organization_preference_id
            and self.facility_id
            and self.organization_preference.organization_id
            != self.facility.organization_id
        ):
            raise ValidationError(
                "Payer override must belong to the facility organization."
            )

    @property
    def effective_carrier(self):
        if self.carrier_id:
            return self.carrier
        if self.organization_preference_id:
            return self.organization_preference.carrier
        return None

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.facility} payer override"


class PatientInsurancePolicy(models.Model):
    COVERAGE_ORDER_CHOICES = [
        ("primary", "Primary"),
        ("secondary", "Secondary"),
        ("tertiary", "Tertiary"),
        ("other", "Other"),
    ]

    RELATIONSHIP_CHOICES = [
        ("self", "Self"),
        ("spouse", "Spouse"),
        ("child", "Child"),
        ("parent", "Parent"),
        ("other", "Other"),
    ]

    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="insurance_policies",
    )
    carrier = models.ForeignKey(
        InsuranceCarrier,
        on_delete=models.PROTECT,
        related_name="policies",
    )
    plan_name = models.CharField(max_length=150, blank=True)
    member_id = models.CharField(max_length=100)
    group_number = models.CharField(max_length=100, blank=True)
    subscriber_name = models.CharField(max_length=150, blank=True)
    relationship_to_subscriber = models.CharField(
        max_length=20,
        choices=RELATIONSHIP_CHOICES,
        default="self",
    )
    effective_date = models.DateField(null=True, blank=True)
    termination_date = models.DateField(null=True, blank=True)
    coverage_order = models.CharField(
        max_length=20,
        choices=COVERAGE_ORDER_CHOICES,
        default="secondary",
    )
    is_primary = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["patient", "-is_primary", "coverage_order", "carrier__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["patient", "carrier", "member_id"],
                condition=models.Q(is_active=True),
                name="unique_active_insurance_policy_per_member",
            ),
            models.UniqueConstraint(
                fields=["patient"],
                condition=models.Q(is_primary=True),
                name="unique_primary_insurance_policy_per_patient",
            ),
        ]

    def save(self, *args, **kwargs):
        if self.coverage_order == "primary":
            self.is_primary = True
        elif self.is_primary:
            self.coverage_order = "primary"

        with transaction.atomic():
            # Demote any other primary BEFORE persisting this one so the
            # partial unique constraint never sees two primaries, and so a
            # concurrent write can't leave the patient with two primaries.
            if self.is_primary:
                PatientInsurancePolicy.objects.filter(
                    patient=self.patient, is_primary=True
                ).exclude(pk=self.pk).update(
                    is_primary=False, coverage_order="secondary"
                )
            super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.patient} - {self.carrier}"
