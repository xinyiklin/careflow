"""Smoke tests for allergen / reaction catalog endpoints."""

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .allergen_catalog import ALLERGEN_CATALOG
from .reaction_catalog import REACTION_CATALOG

User = get_user_model()


class AllergyCatalogEndpointsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="allergy-catalog-reader", password="x"
        )
        self.client.force_authenticate(self.user)

    def test_allergen_catalog_lists_entries(self):
        response = self.client.get("/v1/allergies/allergen-catalog/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), len(ALLERGEN_CATALOG))
        labels = {entry["label"] for entry in response.data}
        self.assertIn("Penicillin", labels)
        self.assertIn("Peanuts", labels)

    def test_reaction_catalog_lists_entries(self):
        response = self.client.get("/v1/allergies/reaction-catalog/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), len(REACTION_CATALOG))
        labels = {entry["label"] for entry in response.data}
        self.assertIn("Anaphylaxis", labels)

    def test_anonymous_request_rejected(self):
        self.client.force_authenticate(None)
        response = self.client.get("/v1/allergies/allergen-catalog/")
        self.assertEqual(response.status_code, 401)
