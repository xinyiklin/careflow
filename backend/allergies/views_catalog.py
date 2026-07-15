"""Read-only catalog endpoints for allergens and adverse reactions."""

from rest_framework import mixins, permissions, viewsets
from rest_framework.response import Response

from .allergen_catalog import get_catalog_entries as get_allergen_entries
from .reaction_catalog import get_catalog_entries as get_reaction_entries
from .serializers import AllergenCatalogEntrySerializer, ReactionCatalogEntrySerializer


class _ReadOnlyCatalogViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    entries_fn = None

    def list(self, request, *args, **kwargs):
        return Response(self.get_serializer(self.entries_fn(), many=True).data)


class AllergenCatalogViewSet(_ReadOnlyCatalogViewSet):
    entries_fn = staticmethod(get_allergen_entries)
    serializer_class = AllergenCatalogEntrySerializer


class ReactionCatalogViewSet(_ReadOnlyCatalogViewSet):
    entries_fn = staticmethod(get_reaction_entries)
    serializer_class = ReactionCatalogEntrySerializer
