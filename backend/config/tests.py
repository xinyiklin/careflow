from django.test import TestCase

from .api_catalog import API_ENDPOINT_SECTIONS


class APIHomeViewTests(TestCase):
    def test_api_home_merges_section_jumps_into_filter_toolbar(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Filter endpoints")
        self.assertContains(response, "Sections")
        self.assertNotContains(response, "Jump to a domain")
        self.assertNotContains(response, "Suggested auth header")
        self.assertNotContains(response, "Facility-scoped request shape")

    def test_catalog_does_not_advertise_unsupported_clinician_refill_create(self):
        endpoints = [
            endpoint
            for section in API_ENDPOINT_SECTIONS
            for endpoint in section["endpoints"]
        ]

        self.assertFalse(
            any(
                endpoint["method"] == "POST"
                and endpoint["path"]
                == "/v1/medications/refill-requests/?facility_id=<id>"
                for endpoint in endpoints
            )
        )
