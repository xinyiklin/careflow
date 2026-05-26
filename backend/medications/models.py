from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


def get_user_display_name(user):
    if not user:
        return ""
    return user.get_full_name() or user.get_username() or ""


class Medication(models.Model):
    STATUS_ACTIVE = "active"
    STATUS_INACTIVE = "inactive"
    STATUS_DISCONTINUED = "discontinued"

    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_INACTIVE, "Inactive"),
        (STATUS_DISCONTINUED, "Discontinued"),
    ]

    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.PROTECT,
        related_name="medications",
    )
    facility = models.ForeignKey(
        "facilities.Facility",
        on_delete=models.CASCADE,
        related_name="medications",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
    )
    medication_name = models.CharField(max_length=180)
    dose = models.CharField(max_length=120)
    route = models.CharField(max_length=80)
    frequency = models.CharField(max_length=120)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    prescriber_name = models.CharField(max_length=150, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_medications",
    )
    created_by_name = models.CharField(max_length=150, blank=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_medications",
    )
    updated_by_name = models.CharField(max_length=150, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["patient", "medication_name", "-start_date", "-created_at"]
        indexes = [
            models.Index(fields=["facility", "patient", "status"]),
            models.Index(fields=["facility", "status", "medication_name"]),
        ]

    def clean(self):
        if self.patient and self.facility_id != self.patient.facility_id:
            raise ValidationError(
                {"patient": "Medication facility must match patient facility."}
            )

        if self.end_date and self.start_date and self.end_date < self.start_date:
            raise ValidationError({"end_date": "End date cannot be before start date."})

    def discontinue(self, *, user=None):
        self.status = self.STATUS_DISCONTINUED
        if not self.end_date:
            self.end_date = timezone.localdate()
        if user:
            self.updated_by = user
        self.save()

    def save(self, *args, **kwargs):
        self.full_clean()
        if self.created_by and not self.created_by_name:
            self.created_by_name = get_user_display_name(self.created_by)
        if self.updated_by:
            self.updated_by_name = get_user_display_name(self.updated_by)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.medication_name} - {self.patient}"
