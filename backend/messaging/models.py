from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class MessageThread(models.Model):
    STATUS_OPEN = "open"
    STATUS_CLOSED = "closed"

    STATUS_CHOICES = [
        (STATUS_OPEN, "Open"),
        (STATUS_CLOSED, "Closed"),
    ]

    facility = models.ForeignKey(
        "facilities.Facility",
        on_delete=models.CASCADE,
        related_name="message_threads",
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="message_threads",
    )
    subject = models.CharField(max_length=150)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_OPEN,
    )
    last_message_at = models.DateTimeField(default=timezone.now)
    unread_for_clinician = models.BooleanField(default=True)
    unread_for_patient = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["facility", "status", "-last_message_at"]),
            models.Index(fields=["patient", "-last_message_at"]),
        ]

    def clean(self):
        if self.patient and self.facility_id != self.patient.facility_id:
            raise ValidationError(
                {"patient": "Thread facility must match patient facility."}
            )

    def __str__(self):
        return f"Thread {self.id} — {self.subject} ({self.status})"


class Message(models.Model):
    SENDER_PATIENT = "patient"
    SENDER_CLINICIAN = "clinician"

    SENDER_CHOICES = [
        (SENDER_PATIENT, "Patient"),
        (SENDER_CLINICIAN, "Clinician"),
    ]

    thread = models.ForeignKey(
        MessageThread,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender_kind = models.CharField(max_length=20, choices=SENDER_CHOICES)
    sender_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_messages",
    )
    sender_display_name = models.CharField(max_length=150, blank=True)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)

        if not is_new:
            return

        thread_update_fields = ["last_message_at"]
        self.thread.last_message_at = self.created_at

        if self.sender_kind == self.SENDER_PATIENT:
            self.thread.unread_for_clinician = True
            thread_update_fields.append("unread_for_clinician")
        elif self.sender_kind == self.SENDER_CLINICIAN:
            self.thread.unread_for_patient = True
            thread_update_fields.append("unread_for_patient")

        self.thread.save(update_fields=thread_update_fields)

    def __str__(self):
        return f"{self.sender_kind} message at {self.created_at:%Y-%m-%d %H:%M}"
