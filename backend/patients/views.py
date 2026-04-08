from rest_framework import generics, permissions
from rest_framework.response import Response
from facilities.views import get_request_user, get_active_staff_profile
from .models import Patient
from .serializers import PatientSerializer

class PatientListCreateView(generics.ListCreateAPIView):
    serializer_class = PatientSerializer
    permission_classes = [permissions.AllowAny] # Keeping your Demo Mode compatibility

    def get_queryset(self):
        user = get_request_user(self.request)
        profile = get_active_staff_profile(user)

        if not profile:
            return Patient.objects.none()

        # Only return patients for the user's current facility
        return Patient.objects.filter(
            facility=profile.facility,
            is_active=True
        )

    def perform_create(self, serializer):
        user = get_request_user(self.request)
        profile = get_active_staff_profile(user)
        
        # Automatically assign the patient to the user's facility
        if profile:
            serializer.save(facility=profile.facility)

class PatientDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PatientSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = get_request_user(self.request)
        profile = get_active_staff_profile(user)

        if not profile:
            return Patient.objects.none()

        return Patient.objects.filter(facility=profile.facility)