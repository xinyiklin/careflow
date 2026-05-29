"""Pure helpers and aggregation logic for the appointments app.

Extracted from ``views.py`` so the viewset keeps to request/response wiring
while timezone math, audit-event formatting, and the calendar heatmap
aggregation live as independently testable functions.
"""

from datetime import datetime, timezone as dt_timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import Appointment


def get_facility_timezone(facility):
    tz_name = str(getattr(facility, "timezone", "") or "")
    if not tz_name:
        raise ValidationError({"facility": "Facility timezone is not configured."})

    try:
        return ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        raise ValidationError({"facility": f"Invalid facility timezone: {tz_name}."})


def get_user_display_name(user):
    if not user:
        return "Unknown user"
    return user.get_full_name() or user.username or "Unknown user"


def get_changed_field_labels(instance, validated_data):
    field_labels = {
        "patient": "Patient",
        "resource": "Resource",
        "rendering_provider": "Rendering provider",
        "appointment_time": "Appointment time",
        "reason": "Reason",
        "notes": "Notes",
        "status": "Status",
        "appointment_type": "Visit type",
        "facility": "Facility",
    }
    changed = []

    for field_name, label in field_labels.items():
        if field_name not in validated_data:
            continue

        previous_value = getattr(instance, field_name)
        next_value = validated_data[field_name]

        if hasattr(previous_value, "pk"):
            previous_value = previous_value.pk
        if hasattr(next_value, "pk"):
            next_value = next_value.pk

        if previous_value != next_value:
            changed.append(label)

    return changed


def build_audit_history_item(event):
    metadata = event.metadata or {}
    actor = event.actor

    return {
        "id": f"audit-{event.id}",
        "action": event.action,
        "summary": event.summary,
        "actor_name": (
            get_user_display_name(actor)
            if actor
            else metadata.get("actor_name", "Unknown user")
        ),
        "created_at": event.created_at,
        "changed_fields": metadata.get("changed_fields", []),
        "metadata": metadata,
    }


def compute_heatmap_counts(facility, month_str):
    """Return ``{"month", "counts": {date_iso: count}}`` for a YYYY-MM month.

    Counts are bucketed by the facility-local calendar date. Raises
    ``ValidationError`` if ``month_str`` is not a valid ``YYYY-MM`` value.
    """
    try:
        month_start_date = datetime.strptime(month_str, "%Y-%m").date()
    except ValueError:
        raise ValidationError({"month": "Use YYYY-MM for month."})

    facility_tz = get_facility_timezone(facility)
    next_month = (
        month_start_date.replace(year=month_start_date.year + 1, month=1)
        if month_start_date.month == 12
        else month_start_date.replace(month=month_start_date.month + 1)
    )

    local_start = datetime.combine(month_start_date, datetime.min.time())
    local_end = datetime.combine(next_month, datetime.min.time())
    utc_start = timezone.make_aware(local_start, facility_tz).astimezone(
        dt_timezone.utc
    )
    utc_end = timezone.make_aware(local_end, facility_tz).astimezone(dt_timezone.utc)

    rows = (
        Appointment.objects.filter(
            facility=facility,
            appointment_time__gte=utc_start,
            appointment_time__lt=utc_end,
        )
        .annotate(local_date=TruncDate("appointment_time", tzinfo=facility_tz))
        .values("local_date")
        .annotate(count=Count("id"))
        .order_by("local_date")
    )

    return {
        "month": month_str,
        "counts": {
            row["local_date"].isoformat(): row["count"]
            for row in rows
            if row["local_date"]
        },
    }
