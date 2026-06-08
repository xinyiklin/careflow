from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied

from audit.services import record_audit_event
from facilities.permissions import IsFacilityAdminOrReadOnly
from shared.scoping import FacilityScopedViewSetMixin

from .models import CareProvider, Pharmacy
from .pharmacy_access import get_effective_pharmacy_ids
from .serializers import CareProviderSerializer, PharmacySerializer


class PharmacyViewSet(FacilityScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = PharmacySerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "head", "options"]

    def get_queryset(self):
        facility = self.get_facility()
        queryset = Pharmacy.objects.filter(
            id__in=get_effective_pharmacy_ids(facility),
            is_active=True,
        ).select_related("address")

        search = (self.request.query_params.get("search") or "").strip()
        if search:
            queryset = queryset.filter(name__icontains=search)

        return queryset.order_by("name")


class CareProviderViewSet(FacilityScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = CareProviderSerializer
    permission_classes = [permissions.IsAuthenticated, IsFacilityAdminOrReadOnly]

    def get_queryset(self):
        return CareProvider.objects.filter(facility=self.get_facility()).order_by(
            "last_name",
            "first_name",
            "organization_name",
        )

    def perform_create(self, serializer):
        facility = self.get_facility()
        provider = serializer.save(facility=facility)
        record_audit_event(
            actor=self.request.user,
            facility=facility,
            action="create",
            app_label="patients",
            model_name="careprovider",
            object_pk=provider.pk,
            summary=f"Created care provider {provider.display_name}",
        )

    def perform_update(self, serializer):
        facility = self.get_facility()
        if serializer.instance.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this provider.")
        provider = serializer.save()
        record_audit_event(
            actor=self.request.user,
            facility=facility,
            action="update",
            app_label="patients",
            model_name="careprovider",
            object_pk=provider.pk,
            summary=f"Updated care provider {provider.display_name}",
        )

    def perform_destroy(self, instance):
        facility = self.get_facility()
        if instance.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this provider.")
        instance.is_active = False
        instance.save()
        record_audit_event(
            actor=self.request.user,
            facility=facility,
            action="delete",
            app_label="patients",
            model_name="careprovider",
            object_pk=instance.pk,
            summary=f"Deactivated care provider {instance.display_name}",
        )
