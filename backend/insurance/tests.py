from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from audit.models import AuditEvent
from facilities.models import Facility, Staff, StaffRole
from organizations.models import Organization, OrganizationMembership
from patients.models import Patient

from .models import (
    FacilityInsuranceCarrierOverride,
    InsuranceCarrier,
    PatientInsurancePolicy,
)

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
        # Make the carrier available for this facility so policy writes pass the
        # facility-effective-carrier allowlist (validate_carrier).
        FacilityInsuranceCarrierOverride.objects.create(
            facility=self.facility,
            carrier=self.carrier,
            is_active=True,
            is_hidden=False,
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

    def test_insurance_manage_permission_is_required_for_policy_mutations(self):
        self.user.staff_profiles.update(
            role=StaffRole.objects.get(facility=self.facility, code="physician")
        )

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

        self.assertEqual(response.status_code, 403)

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

    def test_one_primary_policy_demotes_prior_primary(self):
        policy_a = PatientInsurancePolicy.objects.create(
            patient=self.patient,
            carrier=self.carrier,
            member_id="AAA111",
            coverage_order="primary",
            is_primary=True,
        )
        self.assertTrue(policy_a.is_primary)

        policy_b = PatientInsurancePolicy.objects.create(
            patient=self.patient,
            carrier=self.carrier,
            member_id="BBB222",
            coverage_order="primary",
            is_primary=True,
        )

        policy_a.refresh_from_db()
        policy_b.refresh_from_db()
        self.assertFalse(policy_a.is_primary)
        self.assertEqual(policy_a.coverage_order, "secondary")
        self.assertTrue(policy_b.is_primary)
        self.assertEqual(
            PatientInsurancePolicy.objects.filter(
                patient=self.patient, is_primary=True
            ).count(),
            1,
        )

    def test_carrier_not_effective_for_facility_is_rejected(self):
        # Same-facility patient + authorized user, but a carrier that is not in
        # the facility's effective set must be rejected by validate_carrier.
        unlisted = InsuranceCarrier.objects.create(
            name="Unlisted Plan",
            payer_id="UL999",
        )
        response = self.client.post(
            "/v1/insurance/policies/",
            {
                "patient": self.patient.id,
                "carrier": unlisted.id,
                "member_id": "XYZ789",
                "coverage_order": "primary",
                "relationship_to_subscriber": "self",
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("carrier", response.data)
        self.assertEqual(PatientInsurancePolicy.objects.count(), 0)

    def test_duplicate_active_member_id_returns_400(self):
        # A second ACTIVE policy with the same (patient, carrier, member_id) is
        # rejected with a 400 that references member_id (via DRF's condition-aware
        # unique-together validator; the view's IntegrityError->400 catch is the
        # defense-in-depth fallback for a concurrent race). It must NOT be the
        # primary-policy message.
        PatientInsurancePolicy.objects.create(
            patient=self.patient,
            carrier=self.carrier,
            member_id="DUP999",
            coverage_order="secondary",
            is_primary=False,
        )

        response = self.client.post(
            "/v1/insurance/policies/",
            {
                "patient": self.patient.id,
                "carrier": self.carrier.id,
                "member_id": "DUP999",
                "coverage_order": "secondary",
                "relationship_to_subscriber": "self",
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("member_id", str(response.data))
        self.assertNotIn("primary insurance policy", str(response.data))
        self.assertEqual(
            PatientInsurancePolicy.objects.filter(
                patient=self.patient, member_id="DUP999"
            ).count(),
            1,
        )

    def test_soft_deleted_policy_can_be_readded(self):
        # The partial unique constraint (active rows only) must let a previously
        # soft-deleted (patient, carrier, member_id) be re-added.
        policy = PatientInsurancePolicy.objects.create(
            patient=self.patient,
            carrier=self.carrier,
            member_id="REUSE1",
            coverage_order="secondary",
            is_primary=False,
        )
        del_response = self.client.delete(
            f"/v1/insurance/policies/{policy.pk}/",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(del_response.status_code, 204)

        response = self.client.post(
            "/v1/insurance/policies/",
            {
                "patient": self.patient.id,
                "carrier": self.carrier.id,
                "member_id": "REUSE1",
                "coverage_order": "secondary",
                "relationship_to_subscriber": "self",
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            PatientInsurancePolicy.objects.filter(
                patient=self.patient, member_id="REUSE1", is_active=True
            ).count(),
            1,
        )

    def test_second_primary_via_api_demotes_prior(self):
        # The single-field primary constraint has no serializer validator, so a
        # second primary POSTed through the API reaches the model save() and
        # demotes the prior primary instead of being rejected.
        first = self.client.post(
            "/v1/insurance/policies/",
            {
                "patient": self.patient.id,
                "carrier": self.carrier.id,
                "member_id": "PRIM001",
                "coverage_order": "primary",
                "relationship_to_subscriber": "self",
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(first.status_code, 201)

        second = self.client.post(
            "/v1/insurance/policies/",
            {
                "patient": self.patient.id,
                "carrier": self.carrier.id,
                "member_id": "PRIM002",
                "coverage_order": "primary",
                "relationship_to_subscriber": "self",
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(second.status_code, 201)

        self.assertEqual(
            PatientInsurancePolicy.objects.filter(
                patient=self.patient, is_primary=True, is_active=True
            ).count(),
            1,
        )
        prior = PatientInsurancePolicy.objects.get(member_id="PRIM001")
        self.assertFalse(prior.is_primary)


class PatientInsurancePolicyCrossFacilityTests(TestCase):
    """A facility-B staff user must not read, create, update, or delete a
    facility-A patient's insurance policy. Mirrors the messaging
    cross-facility suite: two facilities in one organization, a policy on
    facility A, and a default-facility-B actor."""

    def setUp(self):
        self.client = APIClient()
        self.organization = Organization.objects.create(
            name="CareFlow Health",
            slug="careflow-health",
        )
        self.facility_a = Facility.objects.create(
            organization=self.organization,
            name="Facility A",
            timezone="America/New_York",
        )
        self.facility_b = Facility.objects.create(
            organization=self.organization,
            name="Facility B",
            timezone="America/New_York",
        )
        self.user_b = User.objects.create_user(
            username="billing_b",
            password="testpass123",
            email="billing_b@example.com",
        )
        OrganizationMembership.objects.create(
            user=self.user_b,
            organization=self.organization,
            role=OrganizationMembership.ROLE_MEMBER,
            is_active=True,
        )
        Staff.objects.create(
            user=self.user_b,
            facility=self.facility_b,
            role=StaffRole.objects.get(facility=self.facility_b, code="staff"),
            is_active=True,
            is_default=True,
        )
        self.patient_a = Patient.objects.create(
            facility=self.facility_a,
            first_name="Ava",
            last_name="Adams",
            date_of_birth=date(1988, 3, 3),
            gender=self.facility_a.patient_genders.first(),
        )
        self.carrier = InsuranceCarrier.objects.create(
            name="Cross Facility Plan",
            payer_id="CF999",
        )
        self.policy_a = PatientInsurancePolicy.objects.create(
            patient=self.patient_a,
            carrier=self.carrier,
            member_id="XF123",
            coverage_order="primary",
        )
        self.client.force_authenticate(self.user_b)

    def test_cross_facility_policy_hidden_from_list(self):
        # user_b's default facility is facility B, so the facility-A policy
        # is scoped out entirely.
        response = self.client.get(
            "/v1/insurance/policies/",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_cross_facility_retrieve_returns_404(self):
        response = self.client.get(
            f"/v1/insurance/policies/{self.policy_a.pk}/",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(response.status_code, 404)

    def test_cross_facility_create_for_other_patient_is_denied(self):
        response = self.client.post(
            "/v1/insurance/policies/",
            {
                "patient": self.patient_a.id,
                "carrier": self.carrier.id,
                "member_id": "NEW123",
                "coverage_order": "secondary",
                "relationship_to_subscriber": "self",
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )
        # The carrier is not effective for facility B and the patient belongs
        # to facility A, so the write is rejected either way (400/403).
        self.assertIn(response.status_code, (400, 403))
        self.assertFalse(
            PatientInsurancePolicy.objects.filter(member_id="NEW123").exists()
        )

    def test_cross_facility_update_returns_404(self):
        response = self.client.patch(
            f"/v1/insurance/policies/{self.policy_a.pk}/",
            {"plan_name": "Tampered"},
            format="json",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(response.status_code, 404)
        self.policy_a.refresh_from_db()
        self.assertEqual(self.policy_a.plan_name, "")

    def test_cross_facility_delete_returns_404(self):
        response = self.client.delete(
            f"/v1/insurance/policies/{self.policy_a.pk}/",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(response.status_code, 404)
        self.policy_a.refresh_from_db()
        self.assertTrue(self.policy_a.is_active)
