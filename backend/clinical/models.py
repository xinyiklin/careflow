from django.conf import settings
from django.core.exceptions import ValidationError
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
