from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

# Hard timeout: after this much inactivity a session auto-expires and the slot
# becomes freely available again.
APPOINTMENT_EDIT_SESSION_TIMEOUT = timedelta(minutes=10)
# Idle threshold: a still-active session whose holder has been idle this long can
# be overridden ("taken over") by another editor before the hard timeout. Kept
# above the frontend heartbeat interval so an actively-editing user is never
# prematurely overridable.
APPOINTMENT_EDIT_SESSION_IDLE_OVERRIDE = timedelta(minutes=2)
# How long a "currently being booked" slot presence marker stays live without a
# heartbeat before it auto-expires.
APPOINTMENT_SLOT_HOLD_TIMEOUT = timedelta(minutes=5)


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
    is_billable = models.BooleanField(default=True)

    @property
    def is_effectively_billable(self):
        return (
            self.is_billable
            and getattr(self.status, "is_billable", True)
            and getattr(self.appointment_type, "is_billable", True)
        )

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


class AppointmentEditSession(models.Model):
    appointment = models.OneToOneField(
        Appointment,
        on_delete=models.CASCADE,
        related_name="edit_session",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="appointment_edit_sessions",
    )
    user_display_name = models.CharField(max_length=150, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-last_seen_at"]
        indexes = [
            models.Index(fields=["last_seen_at"], name="appt_edit_last_seen_idx"),
        ]

    def is_active(self, reference_time=None):
        reference_time = reference_time or timezone.now()
        return self.last_seen_at >= reference_time - APPOINTMENT_EDIT_SESSION_TIMEOUT

    def is_idle_for_override(self, reference_time=None):
        """True when the session is still active but the holder has gone idle
        long enough that another editor may take it over."""
        reference_time = reference_time or timezone.now()
        return self.is_active(reference_time) and (
            self.last_seen_at < reference_time - APPOINTMENT_EDIT_SESSION_IDLE_OVERRIDE
        )

    def __str__(self):
        user_name = self.user_display_name or "Unknown user"
        return f"{user_name} editing appointment {self.appointment_id}"


class AppointmentSlotHold(models.Model):
    """Soft "currently being booked" presence marker for an empty schedule slot.

    Mirrors :class:`AppointmentEditSession` but is keyed on a
    ``(facility, resource, start_time)`` slot rather than an existing
    appointment, and is *always* overridable: a second scheduler is warned that
    the slot is being booked and may take it over. Advisory only — the
    appointment write path is unchanged.
    """

    facility = models.ForeignKey(
        "facilities.Facility",
        on_delete=models.CASCADE,
        related_name="slot_holds",
    )
    resource = models.ForeignKey(
        "facilities.FacilityResource",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="slot_holds",
    )
    start_time = models.DateTimeField()
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="appointment_slot_holds",
    )
    user_display_name = models.CharField(max_length=150, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-last_seen_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["facility", "resource", "start_time"],
                name="uniq_slot_hold_facility_resource_start",
            ),
            # Postgres treats NULLs as distinct, so the constraint above does
            # not dedupe resource-agnostic slots. This partial constraint covers
            # the NULL-resource case so concurrent holds on the same cell still
            # collide (Django 4.2 lacks UniqueConstraint(nulls_distinct=False)).
            models.UniqueConstraint(
                fields=["facility", "start_time"],
                condition=models.Q(resource__isnull=True),
                name="uniq_slot_hold_facility_null_resource_start",
            ),
        ]
        indexes = [
            models.Index(
                fields=["facility", "start_time"],
                name="slot_hold_facility_start_idx",
            ),
        ]

    def is_active(self, reference_time=None):
        reference_time = reference_time or timezone.now()
        return self.last_seen_at >= reference_time - APPOINTMENT_SLOT_HOLD_TIMEOUT

    def __str__(self):
        user_name = self.user_display_name or "Unknown user"
        return (
            f"{user_name} booking slot {self.start_time} "
            f"(facility {self.facility_id})"
        )


class BookableSlot(models.Model):
    """Admin-curated time slot a patient can book through the portal.

    No automatic slot calculation in this phase: admins explicitly create
    one row per (provider, appointment_type, time range) they want to
    offer online. Visibility to patients is gated by
    ``Staff.online_scheduling_enabled``,
    ``AppointmentType.bookable_online``, and
    ``Facility.online_scheduling_disabled`` (kill-switch); see
    :func:`appointments.scheduling.slot_offered`.
    """

    provider = models.ForeignKey(
        "facilities.Staff",
        on_delete=models.CASCADE,
        related_name="bookable_slots",
    )
    appointment_type = models.ForeignKey(
        "facilities.AppointmentType",
        on_delete=models.PROTECT,
        related_name="bookable_slots",
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    is_booked = models.BooleanField(default=False)
    appointment = models.OneToOneField(
        Appointment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bookable_slot",
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_bookable_slots",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start_time", "id"]
        indexes = [
            models.Index(
                fields=["provider", "is_booked", "start_time"],
                name="bookable_provider_open_idx",
            ),
            models.Index(
                fields=["appointment_type", "is_booked", "start_time"],
                name="bookable_type_open_idx",
            ),
        ]

    def clean(self):
        if self.start_time and self.end_time and self.end_time <= self.start_time:
            raise ValidationError({"end_time": "End time must be after start time."})

        if (
            self.provider_id
            and self.appointment_type_id
            and self.provider.facility_id != self.appointment_type.facility_id
        ):
            raise ValidationError(
                {
                    "appointment_type": (
                        "Appointment type must belong to the provider's facility."
                    )
                }
            )

        if self.is_booked and self.appointment_id is None:
            raise ValidationError(
                {"appointment": "Booked slots must reference an appointment."}
            )
        if not self.is_booked and self.appointment_id is not None:
            raise ValidationError(
                {"is_booked": "Slot with an appointment must be marked booked."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Slot for provider {self.provider_id} at {self.start_time}"
