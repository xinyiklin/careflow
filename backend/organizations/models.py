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
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
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
