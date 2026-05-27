"""Read-only ICD-10 catalog endpoint."""

from rest_framework import mixins, permissions, viewsets
from rest_framework.response import Response

from .icd10_catalog import get_catalog_entries as get_icd10_entries


class ICD10CatalogViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        return Response(get_icd10_entries())
