"""Resolution helpers for the online-scheduling feature.

All rules are AND-merged across layers — the least permissive setting
wins — so admins always have a kill-switch at a more specific level.
"""

from datetime import timedelta

from django.utils import timezone


def slot_offered(slot) -> bool:
    """Return True if ``slot`` should be visible to portal patients.

    Requires (in addition to the slot itself being open and in the
    future): the facility kill-switch is OFF, the provider has opted
    in, and the appointment type is exposed online.
    """
    if slot.is_booked:
        return False
    if slot.start_time and slot.start_time <= timezone.now():
        return False

    facility = slot.provider.facility
    if facility.online_scheduling_disabled:
        return False
    if not slot.provider.online_scheduling_enabled:
        return False
    if not slot.appointment_type.bookable_online:
        return False
    return True


def slot_auto_confirms(slot) -> bool:
    """Return True if a booking of this slot should land confirmed.

    Requires both the provider and the appointment type to opt in.
    """
    return bool(
        slot.provider.auto_confirm_bookings
        and slot.appointment_type.auto_confirm_bookings
    )


def cancellation_allowed(appointment) -> bool:
    """Whether the patient is allowed to cancel this appointment online.

    Requires both the facility and the rendering provider to have
    online cancellation enabled.
    """
    facility = appointment.facility
    if not facility.online_cancellation_enabled:
        return False
    provider = appointment.rendering_provider
    if not provider or not provider.online_cancellation_enabled:
        return False
    return True


def cancellation_cutoff_for(appointment) -> int:
    """Return the cutoff in hours — the largest (most restrictive)
    cutoff between the facility and the provider settings.
    """
    facility_hours = appointment.facility.cancellation_cutoff_hours or 0
    provider = appointment.rendering_provider
    provider_hours = (provider.cancellation_cutoff_hours or 0) if provider else 0
    return max(facility_hours, provider_hours)


def cancellation_window_open(appointment, now=None) -> bool:
    """Whether the cancellation cutoff has not yet passed."""
    if not cancellation_allowed(appointment):
        return False
    now = now or timezone.now()
    cutoff = cancellation_cutoff_for(appointment)
    deadline = appointment.appointment_time - timedelta(hours=cutoff)
    return now <= deadline
