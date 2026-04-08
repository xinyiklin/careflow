from datetime import datetime

from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied

from facilities.views import get_request_user, get_active_staff_profile
from .models import Appointment
from .serializers import AppointmentSerializer


class AppointmentListCreateView(generics.ListCreateAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = get_request_user(self.request)
        profile = get_active_staff_profile(user)

        if not profile:
            return Appointment.objects.none()

        queryset = (
            Appointment.objects.filter(facility=profile.facility)
            .select_related("status", "appointment_type", "facility")
            .order_by("appointment_time")
        )

        date_str = self.request.query_params.get("date")
        if date_str:
            try:
                selected_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                queryset = queryset.filter(appointment_time__date=selected_date)
            except ValueError:
                pass

        return queryset

    def perform_create(self, serializer):
        user = get_request_user(self.request)
        profile = get_active_staff_profile(user)

        if not profile:
            raise PermissionDenied("Authentication required.")

        facility = serializer.validated_data.get("facility")
        status = serializer.validated_data.get("status")
        appointment_type = serializer.validated_data.get("appointment_type")

        if facility.id != profile.facility.id:
            raise PermissionDenied("You do not have access to this facility.")

        if status.facility_id != facility.id:
            raise PermissionDenied("Selected status does not belong to this facility.")

        if appointment_type.facility_id != facility.id:
            raise PermissionDenied("Selected appointment type does not belong to this facility.")

        serializer.save(created_by=user)


class AppointmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = get_request_user(self.request)
        profile = get_active_staff_profile(user)

        if not profile:
            return Appointment.objects.none()

        return Appointment.objects.filter(
            facility=profile.facility
        ).select_related(
            "status",
            "appointment_type",
            "facility",
        )

    def perform_update(self, serializer):
        user = get_request_user(self.request)
        profile = get_active_staff_profile(user)

        if not profile:
            raise PermissionDenied("Authentication required.")

        facility = serializer.validated_data.get("facility", serializer.instance.facility)
        status = serializer.validated_data.get("status", serializer.instance.status)
        appointment_type = serializer.validated_data.get(
            "appointment_type",
            serializer.instance.appointment_type,
        )

        if facility.id != profile.facility.id:
            raise PermissionDenied("You do not have access to this facility.")

        if status.facility_id != facility.id:
            raise PermissionDenied("Selected status does not belong to this facility.")

        if appointment_type.facility_id != facility.id:
            raise PermissionDenied("Selected appointment type does not belong to this facility.")

        serializer.save()