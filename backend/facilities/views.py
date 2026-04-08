from datetime import datetime
from django.contrib.auth.models import User
from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Facility, 
    Staff, 
    AppointmentStatus, 
    AppointmentType, 
    StaffRole, 
    StaffTitle
)
from .serializers import (
    StaffSerializer, 
    AppointmentStatusSerializer, 
    AppointmentTypeSerializer,
    StaffRoleSerializer,
    StaffTitleSerializer
)

# --- Helper Functions ---

def get_request_user(request):
    """
    Handles authentication check and provides a fallback for Demo Mode.
    """
    if request.user.is_authenticated:
        return request.user

    if getattr(settings, "DEMO_MODE", False):
        # Fallback to a default admin user for portfolio demonstration
        return User.objects.filter(username="admin").first()

    return None

def get_active_staff_profile(user):
    """
    Retrieves the user's active facility profile (Staff record).
    """
    if not user:
        return None

    return Staff.objects.filter(
        user=user,
        is_active=True
    ).select_related("facility", "role", "title").first()


# --- User & Staff Views ---

class CurrentUserView(APIView):
    """
    Returns data about the logged-in user and their current facility/role.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        user = get_request_user(request)
        if not user:
            return Response(
                {"detail": "Authentication credentials were not provided."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        profile = get_active_staff_profile(user)

        data = {
            "id": user.id,
            "username": user.username,
            "full_name": user.get_full_name() or user.username,
            # We now pull the role code from the related StaffRole model
            "role": profile.role.code if profile else None,
            "facility": {
                "id": profile.facility.id,
                "name": profile.facility.name,
            } if profile else None,
        }

        return Response(data)


class PhysicianListView(APIView):
    """
    Returns a list of all active staff members with the 'physician' role 
    at the user's current facility.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        user = get_request_user(request)
        profile = get_active_staff_profile(user)

        if not profile:
            return Response([])

        # Filtering by the 'code' field in the related StaffRole model
        physicians = Staff.objects.filter(
            facility=profile.facility,
            role__code="physician",
            is_active=True
        ).select_related("user", "title").order_by(
            "user__last_name",
            "user__first_name"
        )

        data = [
            {
                "id": p.user.id,
                "name": p.user.get_full_name() or p.user.username,
                # Pulling title code from the related StaffTitle model
                "title": p.title.code if p.title else "",
            }
            for p in physicians
        ]

        return Response(data)


# --- Facility Configuration Views ---

class AppointmentStatusListView(generics.ListAPIView):
    """
    Lists all active appointment statuses for the user's facility.
    """
    serializer_class = AppointmentStatusSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = get_request_user(self.request)
        profile = get_active_staff_profile(user)

        if not profile:
            return AppointmentStatus.objects.none()

        return AppointmentStatus.objects.filter(
            facility=profile.facility,
            is_active=True
        ).order_by("id")


class AppointmentTypeListView(generics.ListAPIView):
    """
    Lists all active appointment types for the user's facility.
    """
    serializer_class = AppointmentTypeSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = get_request_user(self.request)
        profile = get_active_staff_profile(user)

        if not profile:
            return AppointmentType.objects.none()

        return AppointmentType.objects.filter(
            facility=profile.facility,
            is_active=True
        ).order_by("id")

# --- New Management Views ---

class StaffRoleListView(generics.ListAPIView):
    """
    Lists available roles for the current facility (useful for the UI).
    """
    serializer_class = StaffRoleSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = get_request_user(self.request)
        profile = get_active_staff_profile(user)
        if not profile:
            return StaffRole.objects.none()
        return StaffRole.objects.filter(facility=profile.facility)