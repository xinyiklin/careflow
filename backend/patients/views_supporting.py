from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied

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
        serializer.save(facility=self.get_facility())

    def perform_update(self, serializer):
        if serializer.instance.facility_id != self.get_facility().id:
            raise PermissionDenied("You do not have access to this provider.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.facility_id != self.get_facility().id:
            raise PermissionDenied("You do not have access to this provider.")
        instance.is_active = False
        instance.save()
