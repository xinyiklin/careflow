"""Smoke tests for the ICD-10 catalog endpoint."""

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .icd10_catalog import ICD10_CATALOG

User = get_user_model()


class ICD10CatalogEndpointTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="icd-catalog-reader", password="x"
        )
        self.client.force_authenticate(self.user)

    def test_icd10_catalog_lists_entries(self):
        response = self.client.get("/v1/clinical/icd10-catalog/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), len(ICD10_CATALOG))
        codes = {entry["code"] for entry in response.data}
        self.assertIn("I10", codes)  # Hypertension
        self.assertIn("E11.9", codes)  # T2DM

    def test_each_entry_has_code_description_chapter(self):
        response = self.client.get("/v1/clinical/icd10-catalog/")
        for entry in response.data:
            self.assertIn("code", entry)
            self.assertIn("description", entry)
            self.assertIn("chapter", entry)

    def test_anonymous_request_rejected(self):
        self.client.force_authenticate(None)
        response = self.client.get("/v1/clinical/icd10-catalog/")
        self.assertEqual(response.status_code, 401)
