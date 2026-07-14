"""Read-only catalog endpoints for medications, routes, and frequencies."""

from rest_framework import mixins, permissions, viewsets
from rest_framework.response import Response

from .frequency_catalog import get_catalog_entries as get_frequency_entries
from .medication_catalog import get_catalog_entries as get_medication_entries
from .route_catalog import get_catalog_entries as get_route_entries
from .serializers import (
    FrequencyCatalogEntrySerializer,
    MedicationCatalogEntrySerializer,
    RouteCatalogEntrySerializer,
)


class _ReadOnlyCatalogViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Base for the static reference catalogs in this app."""

    permission_classes = [permissions.IsAuthenticated]
    entries_fn = None

    def list(self, request, *args, **kwargs):
        return Response(self.get_serializer(self.entries_fn(), many=True).data)


class MedicationCatalogViewSet(_ReadOnlyCatalogViewSet):
    entries_fn = staticmethod(get_medication_entries)
    serializer_class = MedicationCatalogEntrySerializer


class RouteCatalogViewSet(_ReadOnlyCatalogViewSet):
    entries_fn = staticmethod(get_route_entries)
    serializer_class = RouteCatalogEntrySerializer


class FrequencyCatalogViewSet(_ReadOnlyCatalogViewSet):
    entries_fn = staticmethod(get_frequency_entries)
    serializer_class = FrequencyCatalogEntrySerializer
