from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings

from facilities.models import FacilityResource
from medications.models import PrescriberDelegation, RefillRequest
from organizations.models import OrganizationRole
from patients.models import Patient

User = get_user_model()


@override_settings(
    DEMO_USERNAME="demo",
    PORTAL_DEMO_USERNAME="patient_demo",
    DEMO_MODE=True,
)
class SeedDemoSmokeTest(TestCase):
    """Headline smoke test: the demo seeder runs cleanly on a fresh DB and
    produces the expected accounts, naming, and current-feature data."""

    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo", stdout=StringIO())

    def test_demo_accounts_named_correctly(self):
        demo = User.objects.get(username="demo")
        self.assertEqual((demo.first_name, demo.last_name), ("Demo", "User"))
        self.assertTrue(demo.is_superuser)

        portal_patient = Patient.objects.get(
            portal_account__user__username="patient_demo"
        )
        self.assertEqual(
            (portal_patient.first_name, portal_patient.last_name),
            ("Demo", "Patient"),
        )

    def test_headline_counts(self):
        self.assertEqual(Patient.objects.count(), 76)

    def test_current_feature_data_seeded(self):
        # Organization security roles with populated permission templates.
        self.assertEqual(OrganizationRole.objects.count(), 3)
        self.assertTrue(OrganizationRole.objects.get(code="owner").security_permissions)
        # Prescriber delegation, pharmacy-sourced refill, and exam rooms.
        self.assertTrue(PrescriberDelegation.objects.exists())
        self.assertTrue(
            RefillRequest.objects.filter(source=RefillRequest.SOURCE_PHARMACY).exists()
        )
        self.assertTrue(FacilityResource.objects.exclude(default_room="").exists())
