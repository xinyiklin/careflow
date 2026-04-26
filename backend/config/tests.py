from django.test import TestCase


class APIHomeViewTests(TestCase):
    def test_api_home_merges_section_jumps_into_filter_toolbar(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Filter endpoints")
        self.assertContains(response, "Sections")
        self.assertNotContains(response, "Jump to a domain")
        self.assertNotContains(response, "Suggested auth header")
        self.assertNotContains(response, "Facility-scoped request shape")
