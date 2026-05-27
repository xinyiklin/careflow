"""Read-only catalog endpoints for allergens and adverse reactions."""

from rest_framework import mixins, permissions, viewsets
from rest_framework.response import Response

from .allergen_catalog import get_catalog_entries as get_allergen_entries
from .reaction_catalog import get_catalog_entries as get_reaction_entries


class _ReadOnlyCatalogViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    entries_fn = None

    def list(self, request, *args, **kwargs):
        return Response(type(self).entries_fn())


class AllergenCatalogViewSet(_ReadOnlyCatalogViewSet):
    entries_fn = staticmethod(get_allergen_entries)


class ReactionCatalogViewSet(_ReadOnlyCatalogViewSet):
    entries_fn = staticmethod(get_reaction_entries)
