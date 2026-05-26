from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class PatientAllergy(models.Model):
    CATEGORY_MEDICATION = "medication"
    CATEGORY_FOOD = "food"
    CATEGORY_ENVIRONMENTAL = "environmental"
    CATEGORY_LATEX = "latex"
    CATEGORY_CONTRAST = "contrast"
    CATEGORY_OTHER = "other"

    CATEGORY_CHOICES = [
        (CATEGORY_MEDICATION, "Medication"),
        (CATEGORY_FOOD, "Food"),
        (CATEGORY_ENVIRONMENTAL, "Environmental"),
        (CATEGORY_LATEX, "Latex"),
        (CATEGORY_CONTRAST, "Contrast"),
        (CATEGORY_OTHER, "Other"),
    ]

    SEVERITY_UNKNOWN = "unknown"
    SEVERITY_MILD = "mild"
    SEVERITY_MODERATE = "moderate"
    SEVERITY_SEVERE = "severe"
    SEVERITY_LIFE_THREATENING = "life_threatening"

    SEVERITY_CHOICES = [
        (SEVERITY_UNKNOWN, "Unknown"),
        (SEVERITY_MILD, "Mild"),
        (SEVERITY_MODERATE, "Moderate"),
        (SEVERITY_SEVERE, "Severe"),
        (SEVERITY_LIFE_THREATENING, "Life Threatening"),
    ]

    STATUS_ACTIVE = "active"
    STATUS_INACTIVE = "inactive"
    STATUS_RESOLVED = "resolved"
    STATUS_ENTERED_IN_ERROR = "entered_in_error"

    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_INACTIVE, "Inactive"),
        (STATUS_RESOLVED, "Resolved"),
        (STATUS_ENTERED_IN_ERROR, "Entered in Error"),
    ]

    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.PROTECT,
        related_name="allergies",
    )
    facility = models.ForeignKey(
        "facilities.Facility",
        on_delete=models.CASCADE,
        related_name="patient_allergies",
    )
    allergen = models.CharField(max_length=160)
    category = models.CharField(
        max_length=32,
        choices=CATEGORY_CHOICES,
        default=CATEGORY_OTHER,
    )
    reaction = models.TextField()
    severity = models.CharField(
        max_length=32,
        choices=SEVERITY_CHOICES,
        default=SEVERITY_UNKNOWN,
    )
    onset_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=32,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
    )
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_patient_allergies",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_patient_allergies",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_active", "allergen", "-updated_at"]
        indexes = [
            models.Index(fields=["facility", "patient", "-is_active", "allergen"]),
            models.Index(fields=["facility", "status", "category"]),
        ]
        verbose_name_plural = "Patient allergies"

    def clean(self):
        self.allergen = (self.allergen or "").strip()
        self.reaction = (self.reaction or "").strip()
        self.notes = (self.notes or "").strip()

        if not self.allergen:
            raise ValidationError({"allergen": "Allergen is required."})
        if not self.reaction:
            raise ValidationError({"reaction": "Reaction is required."})
        if self.patient_id and self.facility_id != self.patient.facility_id:
            raise ValidationError(
                {"patient": "Allergy facility must match patient facility."}
            )
        if self.onset_date and self.onset_date > timezone.localdate():
            raise ValidationError({"onset_date": "Onset date cannot be in the future."})

        self.is_active = self.status == self.STATUS_ACTIVE

    def save(self, *args, **kwargs):
        if self.patient_id:
            self.facility_id = self.patient.facility_id
        self.full_clean()
        super().save(*args, **kwargs)

    def mark_entered_in_error(self, *, user=None):
        self.status = self.STATUS_ENTERED_IN_ERROR
        if user:
            self.updated_by = user
        self.save()

    def __str__(self):
        return f"{self.allergen} allergy for {self.patient}"
