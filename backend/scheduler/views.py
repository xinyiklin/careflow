from datetime import datetime, time
from django.utils import timezone
from rest_framework import generics, permissions
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie

from .models import Appointment
from .serializers import AppointmentSerializer


@method_decorator(ensure_csrf_cookie, name='dispatch')
class AppointmentListCreateView(generics.ListCreateAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Appointment.objects.filter(
            facility=self.request.user.staffprofile.facility
        ).order_by('appointment_time')

        date_str = self.request.query_params.get('date')

        if date_str:
            try:
                selected_date = datetime.strptime(date_str, "%Y-%m-%d").date()

                start_of_day = timezone.make_aware(
                    datetime.combine(selected_date, time.min)
                )
                end_of_day = timezone.make_aware(
                    datetime.combine(selected_date, time.max)
                )

                queryset = queryset.filter(
                    appointment_time__range=(start_of_day, end_of_day)
                )
            except ValueError:
                pass

        return queryset

    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user,
            facility=self.request.user.staffprofile.facility
        )


class AppointmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Appointment.objects.filter(
            facility=self.request.user.staffprofile.facility
        )