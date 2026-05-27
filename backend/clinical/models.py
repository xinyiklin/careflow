from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


def get_user_display_name(user):
    if not user:
        return ""
    return user.get_full_name() or user.get_username() or ""


def has_changed(instance, original, field_names):
    for field_name in field_names:
        if getattr(instance, field_name) != getattr(original, field_name):
            return True
    return False


class Encounter(models.Model):
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_SIGNED = "signed"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (STATUS_IN_PROGRESS, "In Progress"),
        (STATUS_SIGNED, "Signed"),
        (STATUS_CANCELLED, "Cancelled"),
    ]
    SIGNED_LOCKED_FIELDS = [
        "patient_id",
        "facility_id",
        "appointment_id",
        "rendering_provider_id",
        "status",
        "reason",
        "started_at",
        "ended_at",
    ]

    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.PROTECT,
        related_name="clinical_encounters",
    )
    facility = models.ForeignKey(
        "facilities.Facility",
        on_delete=models.CASCADE,
        related_name="clinical_encounters",
    )
    appointment = models.OneToOneField(
        "appointments.Appointment",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="clinical_encounter",
    )
    rendering_provider = models.ForeignKey(
        "facilities.Staff",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="clinical_encounters",
    )
    rendering_provider_name = models.CharField(max_length=150, blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_IN_PROGRESS,
    )
    reason = models.TextField(blank=True)
    started_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_clinical_encounters",
    )
    created_by_name = models.CharField(max_length=150, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-started_at", "-created_at"]
        indexes = [
            models.Index(fields=["facility", "patient", "-started_at"]),
            models.Index(fields=["facility", "status", "-started_at"]),
        ]

    def clean(self):
        if self.pk:
            original = Encounter.objects.filter(pk=self.pk).first()
            if (
                original
                and original.status == self.STATUS_SIGNED
                and has_changed(self, original, self.SIGNED_LOCKED_FIELDS)
            ):
                raise ValidationError({"status": "Signed encounters cannot be edited."})

        if self.patient and self.facility_id != self.patient.facility_id:
            raise ValidationError(
                {"patient": "Encounter facility must match patient facility."}
            )

        if self.appointment:
            if self.appointment.facility_id != self.facility_id:
                raise ValidationError(
                    {
                        "appointment": (
                            "Appointment must belong to the encounter facility."
                        )
                    }
                )
            if self.appointment.patient_id != self.patient_id:
                raise ValidationError(
                    {"appointment": "Appointment must belong to the encounter patient."}
                )

        if (
            self.rendering_provider
            and self.rendering_provider.facility_id != self.facility_id
        ):
            raise ValidationError(
                {
                    "rendering_provider": (
                        "Rendering provider must belong to the encounter facility."
                    )
                }
            )

        if self.ended_at and self.started_at and self.ended_at < self.started_at:
            raise ValidationError(
                {"ended_at": "Encounter end time must be after start time."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        if self.created_by and not self.created_by_name:
            self.created_by_name = get_user_display_name(self.created_by)
        if self.rendering_provider:
            staff_user = self.rendering_provider.user
            title_name = getattr(self.rendering_provider.title, "name", "") or ""
            user_name = get_user_display_name(staff_user)
            self.rendering_provider_name = " ".join(
                part for part in [title_name, user_name] if part
            ).strip()
        else:
            self.rendering_provider_name = ""
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Encounter {self.pk} for {self.patient}"


class ProgressNote(models.Model):
    STATUS_DRAFT = "draft"
    STATUS_SIGNED = "signed"

    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_SIGNED, "Signed"),
    ]
    SIGNED_LOCKED_FIELDS = [
        "encounter_id",
        "status",
        "subjective",
        "objective",
        "assessment",
        "plan",
        "created_by_id",
        "signed_by_id",
        "signed_by_name",
        "signed_at",
    ]

    encounter = models.OneToOneField(
        Encounter,
        on_delete=models.CASCADE,
        related_name="progress_note",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT,
    )
    subjective = models.TextField(blank=True)
    objective = models.TextField(blank=True)
    assessment = models.TextField(blank=True)
    plan = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_progress_notes",
    )
    signed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="signed_progress_notes",
    )
    signed_by_name = models.CharField(max_length=150, blank=True)
    signed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def clean(self):
        if self.pk:
            original = ProgressNote.objects.filter(pk=self.pk).first()
            if (
                original
                and original.status == self.STATUS_SIGNED
                and has_changed(self, original, self.SIGNED_LOCKED_FIELDS)
            ):
                raise ValidationError(
                    {"status": "Signed progress notes cannot be edited."}
                )

        if self.status == self.STATUS_SIGNED and not self.signed_at:
            raise ValidationError({"signed_at": "Signed notes require a signed time."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def sign(self, user):
        if self.status == self.STATUS_SIGNED:
            return

        self.status = self.STATUS_SIGNED
        self.signed_by = user
        self.signed_by_name = get_user_display_name(user)
        self.signed_at = timezone.now()
        self.encounter.status = Encounter.STATUS_SIGNED
        self.encounter.ended_at = self.encounter.ended_at or self.signed_at
        self.encounter.save(update_fields=["status", "ended_at", "updated_at"])
        self.save(
            update_fields=[
                "status",
                "signed_by",
                "signed_by_name",
                "signed_at",
                "updated_at",
            ]
        )

    def unsign(self):
        if self.status != self.STATUS_SIGNED:
            return

        Encounter.objects.filter(pk=self.encounter_id).update(
            status=Encounter.STATUS_IN_PROGRESS,
        )
        self.encounter.status = Encounter.STATUS_IN_PROGRESS

        self.status = self.STATUS_DRAFT
        self.signed_by = None
        self.signed_by_name = ""
        self.signed_at = None
        ProgressNote.objects.filter(pk=self.pk).update(
            status=self.STATUS_DRAFT,
            signed_by=None,
            signed_by_name="",
            signed_at=None,
        )

    def __str__(self):
        return f"Progress note for encounter {self.encounter_id}"


class Vitals(models.Model):
    """A single set of observed vital signs attached to a clinical encounter.

    Cohesive with :class:`Encounter` (1-to-1): each visit records at most one
    vitals snapshot in this MVP; multi-set workflows (admit/discharge) can be
    layered later. Locked from edits once the parent encounter is signed,
    matching the :class:`ProgressNote` sign-off contract.
    """

    LOCKED_FIELDS = [
        "height_cm",
        "weight_kg",
        "bp_systolic",
        "bp_diastolic",
        "heart_rate_bpm",
        "respiratory_rate",
        "temperature_c",
        "spo2_percent",
        "pain_score",
        "measured_at",
        "notes",
    ]

    encounter = models.OneToOneField(
        Encounter,
        on_delete=models.CASCADE,
        related_name="vitals",
    )
    height_cm = models.DecimalField(
        max_digits=5,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[
            MinValueValidator(Decimal("20")),
            MaxValueValidator(Decimal("260")),
        ],
    )
    weight_kg = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[
            MinValueValidator(Decimal("0.5")),
            MaxValueValidator(Decimal("500")),
        ],
    )
    bp_systolic = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(50), MaxValueValidator(260)],
    )
    bp_diastolic = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(30), MaxValueValidator(180)],
    )
    heart_rate_bpm = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(20), MaxValueValidator(260)],
    )
    respiratory_rate = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(4), MaxValueValidator(80)],
    )
    temperature_c = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("25")), MaxValueValidator(Decimal("45"))],
    )
    spo2_percent = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(50), MaxValueValidator(100)],
    )
    pain_score = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MaxValueValidator(10)],
    )
    measured_at = models.DateTimeField(default=timezone.now)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recorded_vitals",
    )
    recorded_by_name = models.CharField(max_length=150, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-measured_at"]
        verbose_name_plural = "Vitals"

    @property
    def bmi(self):
        """Compute body mass index from stored height/weight, rounded to 1 dp."""
        if not self.height_cm or not self.weight_kg:
            return None
        height_m = Decimal(self.height_cm) / Decimal("100")
        if height_m <= 0:
            return None
        value = Decimal(self.weight_kg) / (height_m * height_m)
        return value.quantize(Decimal("0.1"))

    def clean(self):
        if self.pk:
            original = Vitals.objects.filter(pk=self.pk).first()
            encounter_signed = (
                original and original.encounter.status == Encounter.STATUS_SIGNED
            )
            if encounter_signed and has_changed(self, original, self.LOCKED_FIELDS):
                raise ValidationError(
                    {"encounter": "Vitals are locked after the encounter is signed."}
                )

        if (
            self.bp_systolic
            and self.bp_diastolic
            and self.bp_diastolic >= self.bp_systolic
        ):
            raise ValidationError(
                {"bp_diastolic": "Diastolic must be less than systolic."}
            )

        if (
            self.measured_at
            and self.encounter_id
            and self.encounter.started_at
            and self.measured_at < self.encounter.started_at
        ):
            raise ValidationError(
                {
                    "measured_at": "Vitals cannot be measured before the encounter starts."
                }
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        if self.recorded_by and not self.recorded_by_name:
            self.recorded_by_name = get_user_display_name(self.recorded_by)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Vitals for encounter {self.encounter_id}"
