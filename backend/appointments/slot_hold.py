"""Soft "currently being booked" presence for empty schedule slots.

Mirrors :class:`appointments.edit_session.AppointmentEditSessionMixin` but keyed
on a ``(facility, resource, start_time)`` slot rather than an existing
appointment, and is *always* overridable: a second scheduler is warned that the
slot is being booked and may take it over. Advisory only — the appointment
write path is unchanged. Mixed into ``AppointmentViewSet``; the detail=False
``@action`` is discovered by the router via inheritance.
"""

from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import serializers, status as drf_status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from facilities.models import FacilityResource
from facilities.security import user_has_facility_permission

from .models import AppointmentSlotHold
from .services import get_facility_timezone, get_user_display_name


class SlotHoldActiveUserSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(allow_null=True)
    user_name = serializers.CharField()
    started_at = serializers.DateTimeField()
    last_seen_at = serializers.DateTimeField()


class SlotHoldResponseSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=["available", "active", "occupied", "released"]
    )
    can_override = serializers.BooleanField(required=False)
    active_user = SlotHoldActiveUserSerializer(allow_null=True, required=False)


# The slot is identified by query params (not a body) so PATCH/DELETE — which
# carry no request body in OpenAPI — stay accurately documentable.
_SLOT_KEY_PARAMS = [
    OpenApiParameter(
        name="start_time",
        type=OpenApiTypes.DATETIME,
        location=OpenApiParameter.QUERY,
        required=True,
        description="Facility-local slot start, e.g. 2026-04-22T09:00.",
    ),
    OpenApiParameter(
        name="resource",
        type=int,
        location=OpenApiParameter.QUERY,
        description="Resource (schedule column) id; omit for resource-agnostic slots.",
    ),
]
_SLOT_OVERRIDE_PARAM = OpenApiParameter(
    name="override",
    type=bool,
    location=OpenApiParameter.QUERY,
    description="Take over another scheduler's hold on the slot.",
)


class SlotHoldMixin:
    """Adds the ``slot-hold`` action (and its helpers) to a viewset."""

    def _require_slot_hold_permission(self, facility):
        if not user_has_facility_permission(
            self.request.user, facility.id, "schedule.create"
        ):
            raise PermissionDenied("You do not have access to create appointments.")

    def _serialize_slot_hold(self, hold):
        if not hold:
            return None

        return {
            "user_id": hold.user_id,
            "user_name": hold.user_display_name or "Unknown user",
            "started_at": hold.started_at,
            "last_seen_at": hold.last_seen_at,
        }

    def _resolve_slot_key(self, facility):
        """Parse and validate the (resource, start_time) slot key from the
        query string.

        Two schedulers double-clicking the same cell send the same
        ``start_time`` string, so the parsed datetime matches deterministically
        regardless of timezone interpretation.
        """
        start_time_raw = self.request.query_params.get("start_time")
        if not start_time_raw:
            raise ValidationError({"start_time": "This field is required."})

        start_time = parse_datetime(str(start_time_raw))
        if start_time is None:
            raise ValidationError({"start_time": "Use an ISO datetime."})
        if timezone.is_naive(start_time):
            start_time = timezone.make_aware(
                start_time, get_facility_timezone(facility)
            )

        resource = None
        resource_raw = self.request.query_params.get("resource")
        if resource_raw not in (None, "", 0, "0"):
            try:
                resource_id = int(resource_raw)
            except (TypeError, ValueError):
                raise ValidationError({"resource": "Use a numeric id."})
            resource = FacilityResource.objects.filter(
                pk=resource_id, facility=facility
            ).first()
            if not resource:
                raise ValidationError(
                    {"resource": "Resource not found for this facility."}
                )

        return resource, start_time

    def _set_current_slot_hold(self, facility, resource, start_time):
        hold, _created = AppointmentSlotHold.objects.update_or_create(
            facility=facility,
            resource=resource,
            start_time=start_time,
            defaults={
                "user": self.request.user,
                "user_display_name": get_user_display_name(self.request.user),
                "last_seen_at": timezone.now(),
            },
        )
        return hold

    def _acquire_slot_hold(self, facility, resource, start_time, *, existing):
        """Take ownership of the slot for the current user.

        When a row already exists (our own hold, or one we are overriding) we
        update it. When none exists we INSERT inside a savepoint; if a
        concurrent scheduler wins the first-acquire race the unique constraint
        rejects our INSERT and we return the winner so the caller can surface an
        "occupied" response instead of a raw 500. Returns ``(hold, winner)`` —
        exactly one is non-None.
        """
        if existing:
            return self._set_current_slot_hold(facility, resource, start_time), None

        try:
            with transaction.atomic():
                hold = AppointmentSlotHold.objects.create(
                    facility=facility,
                    resource=resource,
                    start_time=start_time,
                    user=self.request.user,
                    user_display_name=get_user_display_name(self.request.user),
                )
            return hold, None
        except IntegrityError:
            winner = AppointmentSlotHold.objects.filter(
                facility=facility, resource=resource, start_time=start_time
            ).first()
            return None, winner

    @extend_schema(
        methods=["POST", "PATCH"],
        parameters=[*_SLOT_KEY_PARAMS, _SLOT_OVERRIDE_PARAM],
        request=None,
        responses={200: SlotHoldResponseSerializer},
        description=(
            "Acquire/override (POST) or heartbeat (PATCH) the soft 'being "
            "booked' presence hold on an empty slot."
        ),
    )
    @extend_schema(
        methods=["DELETE"],
        parameters=_SLOT_KEY_PARAMS,
        request=None,
        responses={200: SlotHoldResponseSerializer},
        description="Release the slot hold held by the current user.",
    )
    @action(
        detail=False,
        methods=["post", "patch", "delete"],
        url_path="slot-hold",
    )
    def slot_hold(self, request):
        facility = self.get_facility()
        self._require_slot_hold_permission(facility)
        resource, start_time = self._resolve_slot_key(facility)

        with transaction.atomic():
            hold = (
                AppointmentSlotHold.objects.select_for_update()
                .filter(
                    facility=facility,
                    resource=resource,
                    start_time=start_time,
                )
                .first()
            )
            now = timezone.now()
            is_active = bool(hold and hold.is_active(now))
            is_current_user = bool(hold and hold.user_id == request.user.id)
            active_holder = hold if is_active else None

            if hold and not is_active:
                hold.delete()
                hold = None
                is_current_user = False

            # Slots are always overridable when another scheduler holds them.
            can_override = bool(active_holder and not is_current_user)
            override_requested = request.query_params.get("override") in (
                "true",
                "True",
                "1",
            )

            def occupied_response(holder, overridable=None):
                return Response(
                    {
                        "status": "occupied",
                        "can_override": (
                            can_override if overridable is None else overridable
                        ),
                        "active_user": self._serialize_slot_hold(holder),
                    }
                )

            def active_response(active_hold):
                return Response(
                    {
                        "status": "active",
                        "can_override": False,
                        "active_user": self._serialize_slot_hold(active_hold),
                    }
                )

            def acquire_or_occupied():
                """Take the slot, or yield 'occupied' to a first-acquire race
                winner (slots are always overridable)."""
                hold_obj, winner = self._acquire_slot_hold(
                    facility, resource, start_time, existing=active_holder is not None
                )
                if winner is not None:
                    return occupied_response(winner, overridable=True)
                return active_response(hold_obj)

            if request.method == "DELETE":
                if is_current_user and hold:
                    hold.delete()
                return Response({"status": "released"}, status=drf_status.HTTP_200_OK)

            if request.method == "PATCH":
                if is_current_user and hold:
                    hold.last_seen_at = now
                    hold.save(update_fields=["last_seen_at"])
                    return active_response(hold)

                if active_holder and not override_requested:
                    return occupied_response(active_holder)

                if active_holder:
                    # override of another scheduler's active hold.
                    return active_response(
                        self._set_current_slot_hold(facility, resource, start_time)
                    )

                # PATCH is a heartbeat, not an acquire: a non-holder with no
                # active hold to refresh gets a no-op rather than a new hold.
                return Response(
                    {
                        "status": "available",
                        "can_override": False,
                        "active_user": None,
                    }
                )

            # POST: acquire, refresh own hold, or override another scheduler's.
            if active_holder and not is_current_user and not override_requested:
                return occupied_response(active_holder)

            return acquire_or_occupied()
