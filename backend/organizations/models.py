from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Organization(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    legal_name = models.CharField(max_length=255, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    tax_id = models.CharField(max_length=50, blank=True)
    address = models.OneToOneField(
        "shared.Address",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="organization",
    )
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class OrganizationRole(models.Model):
    SYSTEM_ROLES = {"owner", "admin", "member"}

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="roles",
    )
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=50)
    description = models.CharField(max_length=255, blank=True)
    security_permissions = models.JSONField(default=dict, blank=True)
    is_system_role = models.BooleanField(default=False)
    is_deletable = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("organization", "code")
        ordering = ["name"]

    def clean(self):
        if self.pk:
            old = OrganizationRole.objects.get(pk=self.pk)
            if old.code in self.SYSTEM_ROLES:
                if self.code != old.code:
                    raise ValidationError(
                        {"code": f"{old.name} role code cannot be changed."}
                    )
                if self.name != old.name:
                    raise ValidationError(
                        {"name": f"{old.name} role name cannot be changed."}
                    )
                if self.is_active != old.is_active:
                    raise ValidationError(
                        {"is_active": f"{old.name} role cannot be deactivated."}
                    )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if not self.is_deletable:
            raise ValidationError("This default role cannot be deleted.")
        super().delete(*args, **kwargs)

    def __str__(self):
        return self.name


class OrganizationMembership(models.Model):
    ROLE_OWNER = "owner"
    ROLE_ADMIN = "admin"
    ROLE_MEMBER = "member"

    ROLE_CHOICES = [
        (ROLE_OWNER, "Owner"),
        (ROLE_ADMIN, "Admin"),
        (ROLE_MEMBER, "Member"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="org_membership",
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.CharField(max_length=50)
    security_permissions = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["organization__name", "user__username"]

    def clean(self):
        if self.user_id:
            existing = OrganizationMembership.objects.filter(user=self.user)
            if self.pk:
                existing = existing.exclude(pk=self.pk)

            if existing.exists():
                raise ValidationError("A user can only belong to one organization.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user} @ {self.organization} ({self.role})"


class OrganizationPharmacyPreference(models.Model):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="pharmacy_preferences",
    )
    pharmacy = models.ForeignKey(
        "patients.Pharmacy",
        on_delete=models.CASCADE,
        related_name="organization_preferences",
    )
    is_preferred = models.BooleanField(default=True)
    is_hidden = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "pharmacy__name"]
        unique_together = ("organization", "pharmacy")

    def __str__(self):
        return f"{self.organization} preference for {self.pharmacy}"


class FacilityPharmacyPreferenceOverride(models.Model):
    facility = models.ForeignKey(
        "facilities.Facility",
        on_delete=models.CASCADE,
        related_name="pharmacy_preference_overrides",
    )
    organization_preference = models.ForeignKey(
        OrganizationPharmacyPreference,
        on_delete=models.CASCADE,
        related_name="facility_overrides",
        null=True,
        blank=True,
    )
    pharmacy = models.ForeignKey(
        "patients.Pharmacy",
        on_delete=models.CASCADE,
        related_name="facility_preference_overrides",
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
            "pharmacy__name",
            "organization_preference__pharmacy__name",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["facility", "organization_preference"],
                name="unique_facility_pharmacy_org_override",
            ),
            models.UniqueConstraint(
                fields=["facility", "pharmacy"],
                name="unique_facility_local_pharmacy_override",
            ),
        ]

    def clean(self):
        if bool(self.organization_preference_id) == bool(self.pharmacy_id):
            raise ValidationError(
                "Provide either an organization preference or a local pharmacy."
            )
        if (
            self.organization_preference_id
            and self.facility_id
            and self.organization_preference.organization_id
            != self.facility.organization_id
        ):
            raise ValidationError(
                "Pharmacy override must belong to the facility organization."
            )

    @property
    def effective_pharmacy(self):
        if self.pharmacy_id:
            return self.pharmacy
        if self.organization_preference_id:
            return self.organization_preference.pharmacy
        return None

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.facility} pharmacy override"
