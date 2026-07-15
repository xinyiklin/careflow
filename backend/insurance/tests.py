from datetime import date

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase
from rest_framework.test import APIClient

from audit.models import AuditEvent
from facilities.models import Facility, Staff, StaffRole
from organizations.models import Organization, OrganizationMembership
from patients.models import Patient

from .models import (
    FacilityInsuranceCarrierOverride,
    InsuranceCarrier,
    OrganizationInsuranceCarrierPreference,
    PatientInsurancePolicy,
)
from .views import PatientInsurancePolicyViewSet

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

        self.assertEqual(response.status_code, 201, response.data)
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

    def test_patch_cannot_reassign_policy_to_another_patient(self):
        # The owning patient FK is read-only, so a PATCH that supplies a
        # different (same-facility) patient PK must be silently ignored by DRF:
        # the request succeeds (200) but the policy stays with its original
        # patient — no cross-patient PHI reassignment.
        other_patient = Patient.objects.create(
            facility=self.facility,
            first_name="Noah",
            last_name="Nguyen",
            date_of_birth=date(1985, 7, 12),
            gender=self.facility.patient_genders.first(),
        )
        policy = PatientInsurancePolicy.objects.create(
            patient=self.patient,
            carrier=self.carrier,
            member_id="OWN123",
            coverage_order="primary",
        )

        response = self.client.patch(
            f"/v1/insurance/policies/{policy.pk}/",
            {
                "patient": other_patient.id,
                "plan_name": "Updated Plan",
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        policy.refresh_from_db()
        self.assertEqual(policy.patient_id, self.patient.id)
        self.assertNotEqual(policy.patient_id, other_patient.id)

    def test_policy_integrity_error_maps_primary_and_reraises_unknown(self):
        # _policy_integrity_error maps each recognized partial-unique constraint
        # to its own 400 field, and re-raises any other IntegrityError so an
        # unrelated/future fault surfaces as a real server error instead of a
        # mislabeled is_primary 400.
        viewset = PatientInsurancePolicyViewSet()

        primary_result = viewset._policy_integrity_error(
            IntegrityError(
                "duplicate key value violates unique constraint "
                '"unique_primary_insurance_policy_per_patient"'
            )
        )
        self.assertIn("is_primary", primary_result)

        member_result = viewset._policy_integrity_error(
            IntegrityError(
                "duplicate key value violates unique constraint "
                '"unique_active_insurance_policy_per_member"'
            )
        )
        self.assertIn("member_id", member_result)

        with self.assertRaises(IntegrityError):
            viewset._policy_integrity_error(
                IntegrityError("some unrelated constraint failure")
            )

    def test_facility_can_link_global_payer_without_organization_preference(self):
        self.user.staff_profiles.update(
            role=StaffRole.objects.get(facility=self.facility, code="admin")
        )
        global_carrier = InsuranceCarrier.objects.create(
            name="Global Direct Plan",
            payer_id="GDP001",
        )
        other_facility = Facility.objects.create(
            organization=self.organization,
            name="Other Clinic",
            timezone="America/New_York",
        )
        private_carrier = InsuranceCarrier.objects.create(
            name="Other Facility Plan",
            payer_id="OFP001",
            owning_facility=other_facility,
            source=InsuranceCarrier.SOURCE_CUSTOM,
        )

        directory_response = self.client.get(
            "/v1/insurance/facility-carrier-overrides/directory/",
            {"facility_id": self.facility.id},
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(directory_response.status_code, 200)
        directory_ids = {item["id"] for item in directory_response.data}
        self.assertIn(global_carrier.id, directory_ids)
        self.assertNotIn(private_carrier.id, directory_ids)

        create_response = self.client.post(
            "/v1/insurance/facility-carrier-overrides/"
            f"?facility_id={self.facility.id}",
            {"carrier_id": global_carrier.id, "is_active": True},
            format="json",
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(create_response.status_code, 201)
        self.assertTrue(
            FacilityInsuranceCarrierOverride.objects.filter(
                facility=self.facility,
                carrier=global_carrier,
            ).exists()
        )

    def test_facility_custom_payer_is_private_to_that_facility(self):
        self.user.staff_profiles.update(
            role=StaffRole.objects.get(facility=self.facility, code="admin")
        )
        response = self.client.post(
            "/v1/insurance/facility-carrier-overrides/"
            f"?facility_id={self.facility.id}",
            {
                "carrier_details": {
                    "name": "Facility Custom Plan",
                    "payer_id": "FCP001",
                },
                "is_active": True,
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 201, response.data)
        carrier = InsuranceCarrier.objects.get(name="Facility Custom Plan")
        self.assertEqual(carrier.owning_facility, self.facility)
        self.assertIsNone(carrier.owning_organization)
        self.assertEqual(carrier.source, InsuranceCarrier.SOURCE_CUSTOM)

    def test_organization_custom_payer_is_owned_by_organization(self):
        OrganizationMembership.objects.filter(user=self.user).update(role="admin")
        response = self.client.post(
            "/v1/insurance/organization-carriers/",
            {
                "carrier": {
                    "name": "Organization Custom Plan",
                    "payer_id": "OCP001",
                },
                "is_active": True,
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 201, response.data)
        carrier = InsuranceCarrier.objects.get(name="Organization Custom Plan")
        self.assertEqual(carrier.owning_organization, self.organization)
        self.assertIsNone(carrier.owning_facility)

    def test_organization_cannot_edit_global_payer_details(self):
        OrganizationMembership.objects.filter(user=self.user).update(role="admin")
        global_carrier = InsuranceCarrier.objects.create(
            name="Canonical Global Plan",
            payer_id="CGP001",
        )
        preference = OrganizationInsuranceCarrierPreference.objects.create(
            organization=self.organization,
            carrier=global_carrier,
        )

        response = self.client.patch(
            f"/v1/insurance/organization-carriers/{preference.id}/",
            {"carrier": {"name": "Tenant Renamed Plan"}},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        global_carrier.refresh_from_db()
        self.assertEqual(global_carrier.name, "Canonical Global Plan")


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


class CarrierOwnershipRemediationTests(TestCase):
    """Regression tests for the payer/pharmacy ownership review findings:
    migration backfill (no cross-tenant leak), directory-identity field locking,
    and the ownerless-scoped directory seeder."""

    def setUp(self):
        self.organization = Organization.objects.create(name="Org A", slug="org-a")
        self.other_organization = Organization.objects.create(
            name="Org B", slug="org-b"
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="A Clinic",
            timezone="America/New_York",
        )

    def test_backfill_assigns_private_carrier_and_leaves_seed_ownerless(self):
        from importlib import import_module

        from django.apps import apps as global_apps

        from .carrier_directory import CARRIER_DIRECTORY

        seed_payer_id = CARRIER_DIRECTORY[0][1]
        # A global directory carrier (payer_id in the seed) left NULL/NULL by 0008.
        global_carrier = InsuranceCarrier.objects.create(
            name="Seeded Global", payer_id=seed_payer_id
        )
        # A tenant-private custom carrier (not in the seed) linked to Org A only.
        private_carrier = InsuranceCarrier.objects.create(
            name="Org A Private", payer_id="ZZZPRIV1"
        )
        OrganizationInsuranceCarrierPreference.objects.create(
            organization=self.organization, carrier=private_carrier
        )

        module = import_module("insurance.migrations.0009_backfill_carrier_ownership")
        module.backfill_carrier_ownership(global_apps, None)

        global_carrier.refresh_from_db()
        private_carrier.refresh_from_db()
        # Seeded row stays ownerless (global, discoverable by everyone).
        self.assertIsNone(global_carrier.owning_organization_id)
        self.assertIsNone(global_carrier.owning_facility_id)
        # Private row is attributed to its organization, so Org B's /directory/
        # can never surface it.
        self.assertEqual(private_carrier.owning_organization_id, self.organization.id)
        self.assertIsNone(private_carrier.owning_facility_id)

    def test_tenant_update_cannot_overwrite_directory_identity_fields(self):
        from .serializers import InsuranceCarrierSerializer

        carrier = InsuranceCarrier.objects.create(
            name="Custom",
            payer_id="CUST1",
            source=InsuranceCarrier.SOURCE_CUSTOM,
            owning_organization=self.organization,
        )
        serializer = InsuranceCarrierSerializer(
            carrier,
            data={
                "name": "Custom Renamed",
                "source": InsuranceCarrier.SOURCE_DIRECTORY,
                "external_id": "HIJACK",
                "directory_source": "careflow-seed",
            },
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        carrier.refresh_from_db()
        self.assertEqual(carrier.name, "Custom Renamed")  # ordinary field updates
        self.assertEqual(carrier.source, InsuranceCarrier.SOURCE_CUSTOM)  # locked
        self.assertEqual(carrier.external_id, "")  # locked
        self.assertEqual(carrier.directory_source, "")  # locked

    def test_load_directories_skips_tenant_owned_carrier_with_same_payer_id(self):
        from django.core.management import call_command

        from .carrier_directory import CARRIER_DIRECTORY

        seed_payer_id = CARRIER_DIRECTORY[0][1]
        tenant_carrier = InsuranceCarrier.objects.create(
            name="Tenant Named",
            payer_id=seed_payer_id,
            source=InsuranceCarrier.SOURCE_CUSTOM,
            owning_organization=self.organization,
        )

        # Must not raise MultipleObjectsReturned and must not overwrite the
        # tenant row with canonical data.
        call_command("load_directories", "--carriers-only", verbosity=0)

        tenant_carrier.refresh_from_db()
        self.assertEqual(tenant_carrier.name, "Tenant Named")
        self.assertEqual(tenant_carrier.owning_organization_id, self.organization.id)
        # A distinct global row now exists for that payer_id.
        self.assertTrue(
            InsuranceCarrier.objects.filter(
                payer_id=seed_payer_id,
                owning_organization__isnull=True,
                owning_facility__isnull=True,
            ).exists()
        )
