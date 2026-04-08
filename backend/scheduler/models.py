from django.db import models
from django.conf import settings


class Appointment(models.Model):
    patient_name = models.CharField(max_length=100)
    doctor_name = models.CharField(max_length=100)
    appointment_time = models.DateTimeField()
    reason = models.TextField(blank=True)

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

    def save(self, *args, **kwargs):
        if self.created_by and not self.created_by_name:
            self.created_by_name = (
                self.created_by.get_full_name() or self.created_by.username
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.patient_name} with {self.doctor_name} at {self.appointment_time}"