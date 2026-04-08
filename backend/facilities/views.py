from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Staff,
    AppointmentStatus,
    AppointmentType,
    StaffRole,
    StaffTitle,
)
from .serializers import (
    AppointmentStatusSerializer,
    AppointmentTypeSerializer,
    StaffRoleSerializer,
    StaffTitleSerializer,
)


def get_request_user(request):
    """
    Handles authentication check and provides a fallback for Demo Mode.
    """
    if request.user.is_authenticated:
        return request.user

    if getattr(settings, "DEMO_MODE", False):
        User = get_user_model()
        return User.objects.filter(username="admin").first()

    return None


def get_active_staff_profile(user):
    """
    Retrieves the user's active facility profile (Staff record).
    """
    if not user:
        return None

    return (
        Staff.objects.filter(user=user, is_active=True)
        .select_related("facility", "role", "title")
        .first()
    )


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
                status=status.HTTP_403_FORBIDDEN,
            )

        profile = get_active_staff_profile(user)

        data = {
            "id": user.id,
            "username": user.username,
            "full_name": user.get_full_name() or user.username,
            "role": profile.role.code if profile and profile.role else None,
            "facility": {
                "id": profile.facility.id,
                "name": profile.facility.name,
            } if profile and profile.facility else None,
        }

        return Response(data)


class PhysicianListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        user = get_request_user(request)
        profile = get_active_staff_profile(user)

        if not profile:
            return Response([])

        physicians = (
            Staff.objects.filter(
                facility=profile.facility,
                role__code="physician",
                role__is_active=True,
                is_active=True,
            )
            .select_related("user", "title")
            .order_by("user__last_name", "user__first_name")
        )

        data = [
            {
                "id": p.user.id,
                "name": p.user.get_full_name() or p.user.username,
                "title": p.title.code if p.title else "",
            }
            for p in physicians
        ]

        return Response(data)


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
            is_active=True,
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
            is_active=True,
        ).order_by("id")


class StaffRoleListView(generics.ListAPIView):
    """
    Lists available active roles for the current facility.
    """
    serializer_class = StaffRoleSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = get_request_user(self.request)
        profile = get_active_staff_profile(user)

        if not profile:
            return StaffRole.objects.none()

        return StaffRole.objects.filter(
            facility=profile.facility,
            is_active=True,
        ).order_by("id")


class StaffTitleListView(generics.ListAPIView):
    """
    Lists available active titles for the current facility.
    """
    serializer_class = StaffTitleSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = get_request_user(self.request)
        profile = get_active_staff_profile(user)

        if not profile:
            return StaffTitle.objects.none()

        return StaffTitle.objects.filter(
            facility=profile.facility,
            is_active=True,
        ).order_by("id")