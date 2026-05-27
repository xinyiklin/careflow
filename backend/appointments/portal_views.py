from datetime import timedelta

from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.generics import ListAPIView

from users.permissions import IsPortalPatient
from users.portal_access import get_patient_for_user

from .models import Appointment
from .portal_serializers import PortalAppointmentSerializer

# Past appointments are limited to a rolling year so the portal doesn't
# load a patient's full lifetime history in one call.
PORTAL_PAST_WINDOW = timedelta(days=365)


@extend_schema(
    parameters=[
        OpenApiParameter(
            name="past",
            description=(
                "When 'true', return appointments from the previous 12 months "
                "ordered descending instead of upcoming appointments."
            ),
            required=False,
            type=str,
        ),
    ],
    responses=PortalAppointmentSerializer(many=True),
    summary="Patient portal appointments",
)
class PortalAppointmentListView(ListAPIView):
    """List the authenticated patient's appointments.

    Default: upcoming appointments ordered by ``appointment_time`` ascending.
    With ``?past=true``: past appointments within the last 12 months,
    ordered by ``appointment_time`` descending.
    """

    serializer_class = PortalAppointmentSerializer
    permission_classes = [IsPortalPatient]
    pagination_class = None

    def get_queryset(self):
        patient = get_patient_for_user(self.request.user)
        now = timezone.now()

        base = Appointment.objects.filter(patient=patient).select_related(
            "patient",
            "facility",
            "status",
            "appointment_type",
            "rendering_provider__user",
        )

        if self._wants_past():
            window_start = now - PORTAL_PAST_WINDOW
            return base.filter(
                appointment_time__lt=now,
                appointment_time__gte=window_start,
            ).order_by("-appointment_time")

        return base.filter(appointment_time__gte=now).order_by("appointment_time")

    def _wants_past(self):
        raw = self.request.query_params.get("past", "")
        return str(raw).lower() in {"1", "true", "yes"}
