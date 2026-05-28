"""Clinician admin viewset for managing online-bookable slots.

Slots are facility-scoped via their provider. Admins with the
``appointments.manage`` permission on the active facility can list,
create, and delete slots; updates are not exposed (admin deletes and
re-creates if the time changes).
"""

from rest_framework import mixins, permissions, serializers, viewsets
from rest_framework.exceptions import PermissionDenied

from facilities.security import user_has_facility_permission
from shared.scoping import FacilityScopedViewSetMixin

from .models import BookableSlot


class BookableSlotSerializer(serializers.ModelSerializer):
    provider_display_name = serializers.SerializerMethodField()
    appointment_type_name = serializers.CharField(
        source="appointment_type.name", read_only=True
    )

    class Meta:
        model = BookableSlot
        fields = [
            "id",
            "provider",
            "provider_display_name",
            "appointment_type",
            "appointment_type_name",
            "start_time",
            "end_time",
            "is_booked",
            "notes",
        ]
        read_only_fields = ["is_booked"]

    def get_provider_display_name(self, obj):
        user = obj.provider.user
        full_name = " ".join(
            part for part in [user.first_name, user.last_name] if part
        ).strip()
        return full_name or user.username


class BookableSlotViewSet(
    FacilityScopedViewSetMixin,
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = BookableSlotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        facility = self.get_facility()
        if not user_has_facility_permission(
            self.request.user, facility.id, "appointments.manage"
        ):
            raise PermissionDenied(
                "You do not have permission to manage bookable slots."
            )
        queryset = (
            BookableSlot.objects.filter(provider__facility=facility)
            .select_related("provider__user", "appointment_type")
            .order_by("start_time", "id")
        )

        provider_id = self.request.query_params.get("provider")
        if provider_id:
            queryset = queryset.filter(provider_id=provider_id)
        return queryset

    def perform_create(self, serializer):
        facility = self.get_facility()
        if not user_has_facility_permission(
            self.request.user, facility.id, "appointments.manage"
        ):
            raise PermissionDenied(
                "You do not have permission to manage bookable slots."
            )
        provider = serializer.validated_data.get("provider")
        if not provider or provider.facility_id != facility.id:
            raise PermissionDenied("Provider must belong to the active facility.")
        serializer.save(created_by=self.request.user)

    def perform_destroy(self, instance):
        if instance.is_booked:
            raise PermissionDenied(
                "Slot has already been booked; cancel the appointment first."
            )
        instance.delete()
