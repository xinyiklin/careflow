from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


def get_staff_display_name(staff):
    if not staff or not getattr(staff, "user_id", None):
        return ""

    full_name = " ".join(
        part for part in [staff.user.first_name, staff.user.last_name] if part
    ).strip()
    base_name = full_name or staff.user.username
    title_name = getattr(staff.title, "name", "") or ""

    return " ".join(part for part in [title_name, base_name] if part).strip()


class Appointment(models.Model):
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.PROTECT,
        related_name="appointments",
    )
    appointment_time = models.DateTimeField()
    room = models.CharField(max_length=50, blank=True)
    reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    end_time = models.DateTimeField(null=True, blank=True)

    status = models.ForeignKey(
        "facilities.AppointmentStatus",
        on_delete=models.PROTECT,
        related_name="appointments",
    )

    appointment_type = models.ForeignKey(
        "facilities.AppointmentType",
        on_delete=models.PROTECT,
        related_name="appointments",
    )

    resource = models.ForeignKey(
        "facilities.FacilityResource",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="appointments",
    )
    rendering_provider = models.ForeignKey(
        "facilities.Staff",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rendered_appointments",
    )
    rendering_provider_name = models.CharField(max_length=150, blank=True)

    facility = models.ForeignKey(
        "facilities.Facility",
        on_delete=models.CASCADE,
        related_name="appointments",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_appointments",
    )

    created_by_name = models.CharField(max_length=150, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def duration_minutes(self):
        if not self.appointment_time or not self.end_time:
            return 0
        return max(
            0, round((self.end_time - self.appointment_time).total_seconds() / 60)
        )

    def clean(self):
        if self.patient and self.facility_id != self.patient.facility_id:
            raise ValidationError(
                {"patient": "Appointment facility must match patient facility."}
            )

        if self.status and self.facility_id != self.status.facility_id:
            raise ValidationError(
                {"status": "Appointment status must belong to the same facility."}
            )

        if (
            self.appointment_type
            and self.facility_id != self.appointment_type.facility_id
        ):
            raise ValidationError(
                {
                    "appointment_type": "Appointment type must belong to the same facility."
                }
            )

        if self.resource and self.facility_id != self.resource.facility_id:
            raise ValidationError(
                {"resource": "Appointment resource must belong to the same facility."}
            )

        if (
            self.rendering_provider
            and self.facility_id != self.rendering_provider.facility_id
        ):
            raise ValidationError(
                {
                    "rendering_provider": (
                        "Rendering provider must belong to the same facility."
                    )
                }
            )

        if (
            self.appointment_time
            and self.end_time
            and self.end_time <= self.appointment_time
        ):
            raise ValidationError(
                {"end_time": "Appointment end time must be after start time."}
            )

    def save(self, *args, **kwargs):
        if self.resource and not str(self.room or "").strip():
            self.room = self.resource.default_room or ""
        if not self.end_time and self.appointment_time and self.appointment_type:
            self.end_time = self.appointment_time + timedelta(
                minutes=self.appointment_type.duration_minutes
            )

        self.full_clean()

        if self.created_by and not self.created_by_name:
            self.created_by_name = (
                self.created_by.get_full_name() or self.created_by.username
            )

        self.rendering_provider_name = (
            get_staff_display_name(self.rendering_provider)
            if self.rendering_provider
            else ""
        )

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.patient.last_name}, {self.patient.first_name} at {self.appointment_time}"
