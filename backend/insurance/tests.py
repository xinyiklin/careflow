from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from audit.models import AuditEvent
from facilities.models import Facility, Staff, StaffRole
from organizations.models import Organization, OrganizationMembership
from patients.models import Patient

from .models import InsuranceCarrier, PatientInsurancePolicy

User = get_user_model()


class PatientInsurancePolicyViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.organization = Organization.objects.create(
            name="CareFlow Health",
            slug="careflow-health",
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Main Clinic",
            timezone="America/New_York",
        )
        self.user = User.objects.create_user(
            username="billing",
            password="testpass123",
            email="billing@example.com",
        )
        OrganizationMembership.objects.create(
            user=self.user,
            organization=self.organization,
            role=OrganizationMembership.ROLE_MEMBER,
            is_active=True,
        )
        Staff.objects.create(
            user=self.user,
            facility=self.facility,
            role=StaffRole.objects.get(facility=self.facility, code="staff"),
            is_active=True,
            is_default=True,
        )
        self.patient = Patient.objects.create(
            facility=self.facility,
            first_name="Mia",
            last_name="Martinez",
            date_of_birth=date(1990, 4, 1),
            gender=self.facility.patient_genders.first(),
        )
        self.carrier = InsuranceCarrier.objects.create(
            name="CareFlow Health Plan",
            payer_id="CF001",
        )
        self.client.force_authenticate(self.user)

    def test_patient_update_permission_can_create_insurance_policy(self):
        response = self.client.post(
            "/v1/insurance/policies/",
            {
                "patient": self.patient.id,
                "carrier": self.carrier.id,
                "member_id": "ABC123",
                "coverage_order": "primary",
                "relationship_to_subscriber": "self",
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(PatientInsurancePolicy.objects.count(), 1)
        self.assertTrue(
            AuditEvent.objects.filter(
                actor=self.user,
                patient=self.patient,
                action="create",
                model_name="patientinsurancepolicy",
            ).exists()
        )

    def test_destroy_soft_deletes_insurance_policy(self):
        policy = PatientInsurancePolicy.objects.create(
            patient=self.patient,
            carrier=self.carrier,
            member_id="ABC123",
            coverage_order="primary",
        )

        response = self.client.delete(
            f"/v1/insurance/policies/{policy.pk}/",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 204)
        policy.refresh_from_db()
        self.assertFalse(policy.is_active)
        list_response = self.client.get(
            "/v1/insurance/policies/",
            {"facility_id": self.facility.id, "patient_id": self.patient.id},
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.data, [])
