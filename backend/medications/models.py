from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q, UniqueConstraint
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
    prescriber = models.ForeignKey(
        "patients.CareProvider",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prescribed_medications",
    )
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

        if self.prescriber and self.prescriber.facility_id != self.facility_id:
            raise ValidationError(
                {"prescriber": "Prescriber must belong to the medication facility."}
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
        if self.prescriber_id:
            self.prescriber_name = getattr(self.prescriber, "display_name", "") or ""
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.medication_name} - {self.patient}"


STATUS_PENDING = "pending"
STATUS_APPROVED = "approved"
STATUS_DENIED = "denied"
STATUS_CANCELLED = "cancelled"

SOURCE_PATIENT = "patient"
SOURCE_PHARMACY = "pharmacy"


class RefillRequest(models.Model):
    STATUS_PENDING = STATUS_PENDING
    STATUS_APPROVED = STATUS_APPROVED
    STATUS_DENIED = STATUS_DENIED
    STATUS_CANCELLED = STATUS_CANCELLED

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_DENIED, "Denied"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    SOURCE_PATIENT = SOURCE_PATIENT
    SOURCE_PHARMACY = SOURCE_PHARMACY

    # Who originated the request. All requests today are patient-initiated
    # via the portal; ``pharmacy`` is reserved for a future pharmacy-facing
    # intake path and has no producer yet.
    SOURCE_CHOICES = [
        (SOURCE_PATIENT, "Patient"),
        (SOURCE_PHARMACY, "Pharmacy"),
    ]

    medication = models.ForeignKey(
        Medication,
        on_delete=models.PROTECT,
        related_name="refill_requests",
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.PROTECT,
        related_name="refill_requests",
    )
    facility = models.ForeignKey(
        "facilities.Facility",
        on_delete=models.CASCADE,
        related_name="refill_requests",
    )
    pharmacy = models.ForeignKey(
        "patients.Pharmacy",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="refill_requests",
    )
    pharmacy_name = models.CharField(max_length=150, blank=True)
    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default=SOURCE_PATIENT,
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )
    patient_note = models.TextField(blank=True, max_length=500)
    clinician_note = models.TextField(blank=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_refill_requests",
    )
    resolved_by_name = models.CharField(max_length=150, blank=True)

    class Meta:
        ordering = ["-requested_at"]
        indexes = [
            models.Index(fields=["facility", "status", "-requested_at"]),
            models.Index(fields=["patient", "-requested_at"]),
        ]
        constraints = [
            UniqueConstraint(
                fields=["medication"],
                condition=Q(status=STATUS_PENDING),
                name="unique_pending_refill_per_medication",
            ),
        ]

    def clean(self):
        if self.medication and self.medication.status != Medication.STATUS_ACTIVE:
            raise ValidationError(
                {"medication": "Refill requests require an active medication."}
            )

        if self.patient and self.facility_id != self.patient.facility_id:
            raise ValidationError(
                {"patient": "Refill request facility must match patient facility."}
            )

        if (
            self.medication
            and self.patient
            and self.medication.facility_id != self.patient.facility_id
        ):
            raise ValidationError(
                {"medication": "Medication facility must match patient facility."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        if self.resolved_by:
            self.resolved_by_name = get_user_display_name(self.resolved_by)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Refill request for {self.medication.medication_name} ({self.status})"


class PrescriberDelegation(models.Model):
    """Authorizes a staff member to act as a prescriber's agent for
    non-controlled refill/prescription work (the "agent" model).

    Placeholder scaffolding: it is captured and editable via Django admin
    but is NOT yet enforced in request handling. Controlled-substance
    signing is never delegable and stays out of scope until EPCS is built.
    """

    facility = models.ForeignKey(
        "facilities.Facility",
        on_delete=models.CASCADE,
        related_name="prescriber_delegations",
    )
    prescriber = models.ForeignKey(
        "patients.CareProvider",
        on_delete=models.CASCADE,
        related_name="delegations",
    )
    delegate = models.ForeignKey(
        "facilities.Staff",
        on_delete=models.CASCADE,
        related_name="prescriber_delegations",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            UniqueConstraint(
                fields=["facility", "prescriber", "delegate"],
                name="unique_prescriber_delegation",
            ),
        ]

    def clean(self):
        if self.prescriber and self.prescriber.facility_id != self.facility_id:
            raise ValidationError(
                {"prescriber": "Prescriber must belong to the delegation facility."}
            )
        if self.delegate and self.delegate.facility_id != self.facility_id:
            raise ValidationError(
                {"delegate": "Delegate must belong to the delegation facility."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.delegate} acts for {self.prescriber}"
