"""Smoke tests for medication / route / frequency catalog endpoints."""

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .frequency_catalog import FREQUENCY_CATALOG
from .medication_catalog import MEDICATION_CATALOG
from .route_catalog import ROUTE_CATALOG

User = get_user_model()


class MedicationCatalogEndpointsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="catalog-reader", password="x")
        self.client.force_authenticate(self.user)

    def test_medication_catalog_lists_entries(self):
        response = self.client.get("/v1/medications/catalog/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), len(MEDICATION_CATALOG))
        first = response.data[0]
        self.assertIn("generic_name", first)
        self.assertIn("common_strengths", first)
        self.assertIn("default_route", first)
        self.assertIn("default_frequency", first)
        self.assertIn("category", first)

    def test_route_catalog_lists_entries(self):
        response = self.client.get("/v1/medications/route-catalog/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), len(ROUTE_CATALOG))
        codes = {entry["code"] for entry in response.data}
        self.assertIn("PO", codes)
        self.assertIn("INH", codes)

    def test_frequency_catalog_lists_entries(self):
        response = self.client.get("/v1/medications/frequency-catalog/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), len(FREQUENCY_CATALOG))
        codes = {entry["code"] for entry in response.data}
        self.assertIn("BID", codes)
        self.assertIn("PRN", codes)

    def test_anonymous_request_rejected(self):
        self.client.logout()
        self.client.force_authenticate(None)
        response = self.client.get("/v1/medications/catalog/")
        self.assertEqual(response.status_code, 401)
