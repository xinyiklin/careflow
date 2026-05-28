"""Portal endpoints for online scheduling: list providers / types / slots,
book a slot, cancel a booking.

All endpoints are facility-scoped via ``get_patient_for_user`` — patients
only see providers, types, slots, and appointments at their own facility.
The kill switch (``Facility.online_scheduling_disabled``), provider
opt-in, and type ``bookable_online`` are enforced at the queryset level.
"""

from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from appointments.models import Appointment, BookableSlot
from appointments.scheduling import (
    cancellation_window_open,
    slot_auto_confirms,
    slot_offered,
)
from facilities.models import AppointmentStatus, AppointmentType, Staff
from users.permissions import IsPortalPatient
from users.portal_access import get_patient_for_user

from .portal_scheduling_serializers import (
    PortalAppointmentBookingResponseSerializer,
    PortalBookingRequestSerializer,
    PortalSchedulingAppointmentTypeSerializer,
    PortalSchedulingProviderSerializer,
    PortalSchedulingSlotSerializer,
)


def _bookable_slot_queryset(patient):
    """Slots the given patient could potentially see in the portal.

    Enforces the resolution rules at the SQL level: future, unbooked,
    matching patient's facility, facility kill-switch off, provider
    opted in, type bookable online.
    """
    now = timezone.now()
    return BookableSlot.objects.filter(
        is_booked=False,
        start_time__gt=now,
        provider__facility=patient.facility,
        provider__online_scheduling_enabled=True,
        provider__facility__online_scheduling_disabled=False,
        appointment_type__bookable_online=True,
    ).select_related("provider__user", "appointment_type", "provider__title")


@extend_schema(
    responses=PortalSchedulingProviderSerializer(many=True),
    summary="Providers offering at least one open online slot",
)
class PortalSchedulingProvidersView(APIView):
    permission_classes = [IsPortalPatient]

    def get(self, request):
        patient = get_patient_for_user(request.user)
        slots = _bookable_slot_queryset(patient)
        provider_ids = slots.values_list("provider_id", flat=True).distinct()
        providers = Staff.objects.filter(
            id__in=provider_ids, is_active=True
        ).select_related("user", "title")

        data = []
        for staff in providers:
            full_name = (
                " ".join(
                    part
                    for part in [staff.user.first_name, staff.user.last_name]
                    if part
                ).strip()
                or staff.user.username
            )
            title_name = getattr(staff.title, "name", "") or ""
            display_name = " ".join(
                part for part in [title_name, full_name] if part
            ).strip()
            data.append(
                {
                    "id": staff.id,
                    "display_name": display_name,
                    "specialty": staff.specialty or "",
                }
            )

        data.sort(key=lambda item: item["display_name"])
        return Response(data)


@extend_schema(
    parameters=[
        OpenApiParameter(
            name="provider",
            description="Provider ID to filter types they have open slots for.",
            required=True,
            type=int,
        ),
    ],
    responses=PortalSchedulingAppointmentTypeSerializer(many=True),
    summary="Appointment types with open slots for a provider",
)
class PortalSchedulingAppointmentTypesView(APIView):
    permission_classes = [IsPortalPatient]

    def get(self, request):
        patient = get_patient_for_user(request.user)
        provider_id = request.query_params.get("provider")
        if not provider_id:
            raise ValidationError({"provider": "Required query parameter."})

        slots = _bookable_slot_queryset(patient).filter(provider_id=provider_id)
        type_ids = slots.values_list("appointment_type_id", flat=True).distinct()
        types = AppointmentType.objects.filter(
            id__in=type_ids, is_active=True
        ).order_by("name")
        return Response(
            PortalSchedulingAppointmentTypeSerializer(types, many=True).data
        )


@extend_schema(
    parameters=[
        OpenApiParameter(name="provider", required=True, type=int),
        OpenApiParameter(name="type", required=True, type=int),
    ],
    responses=PortalSchedulingSlotSerializer(many=True),
    summary="Open bookable slots for a provider + appointment type",
)
class PortalSchedulingSlotsView(APIView):
    permission_classes = [IsPortalPatient]

    def get(self, request):
        patient = get_patient_for_user(request.user)
        provider_id = request.query_params.get("provider")
        type_id = request.query_params.get("type")
        if not provider_id or not type_id:
            raise ValidationError(
                {"detail": "Both 'provider' and 'type' query parameters required."}
            )

        slots = (
            _bookable_slot_queryset(patient)
            .filter(provider_id=provider_id, appointment_type_id=type_id)
            .order_by("start_time")
        )
        return Response(PortalSchedulingSlotSerializer(slots, many=True).data)


def _facility_status(facility, code):
    """Look up the facility's AppointmentStatus row by code; raise if missing."""
    status_row = AppointmentStatus.objects.filter(
        facility=facility, code=code, is_active=True
    ).first()
    if not status_row:
        raise ValidationError(
            {
                "status": (
                    f"Facility {facility.id} is missing an active "
                    f"AppointmentStatus with code '{code}'."
                )
            }
        )
    return status_row


@extend_schema(
    request=PortalBookingRequestSerializer,
    responses=PortalAppointmentBookingResponseSerializer,
    summary="Book a slot from the portal",
)
class PortalSchedulingBookView(APIView):
    permission_classes = [IsPortalPatient]

    @transaction.atomic
    def post(self, request):
        patient = get_patient_for_user(request.user)
        payload = PortalBookingRequestSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        slot_id = payload.validated_data["slot_id"]
        reason = payload.validated_data.get("reason", "")

        # Lock only the slot row; nullable joins (provider.title, appointment)
        # can't participate in FOR UPDATE on Postgres.
        slot = (
            BookableSlot.objects.select_for_update(of=("self",))
            .filter(pk=slot_id)
            .select_related("provider", "appointment_type", "provider__facility")
            .first()
        )
        if not slot:
            raise NotFound("Slot not found.")

        if slot.provider.facility_id != patient.facility_id:
            raise NotFound("Slot not found.")

        if not slot_offered(slot):
            raise ValidationError(
                {"slot": "This slot is no longer available for online booking."}
            )

        status_code = "confirmed" if slot_auto_confirms(slot) else "pending"
        status_row = _facility_status(patient.facility, status_code)
        type_for_facility = (
            slot.appointment_type
            if slot.appointment_type.facility_id == patient.facility_id
            else None
        )
        if not type_for_facility:
            raise ValidationError(
                {"appointment_type": "Type not available at your facility."}
            )

        appointment = Appointment.objects.create(
            patient=patient,
            facility=patient.facility,
            appointment_time=slot.start_time,
            end_time=slot.end_time,
            status=status_row,
            appointment_type=slot.appointment_type,
            rendering_provider=slot.provider,
            reason=reason,
            created_by=request.user,
        )

        slot.is_booked = True
        slot.appointment = appointment
        slot.save()

        return Response(
            PortalAppointmentBookingResponseSerializer(appointment).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    responses=PortalAppointmentBookingResponseSerializer,
    summary="Cancel a patient-booked appointment",
)
class PortalSchedulingCancelView(APIView):
    permission_classes = [IsPortalPatient]

    @transaction.atomic
    def post(self, request, pk):
        patient = get_patient_for_user(request.user)
        appointment = (
            Appointment.objects.select_for_update(of=("self",))
            .filter(pk=pk, patient=patient)
            .select_related("facility", "rendering_provider", "status")
            .first()
        )
        if not appointment:
            raise NotFound("Appointment not found.")

        if not cancellation_window_open(appointment):
            raise ValidationError(
                {
                    "appointment": (
                        "Online cancellation isn't available for this appointment. "
                        "Please contact the office."
                    )
                }
            )

        cancelled_status = _facility_status(appointment.facility, "cancelled")
        appointment.status = cancelled_status
        appointment.save()

        # Free the slot if one was attached
        slot = BookableSlot.objects.filter(appointment=appointment).first()
        if slot:
            slot.is_booked = False
            slot.appointment = None
            slot.save()

        return Response(PortalAppointmentBookingResponseSerializer(appointment).data)
