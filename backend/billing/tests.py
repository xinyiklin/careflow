from datetime import date, datetime
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from appointments.models import Appointment
from audit.models import AuditEvent
from billing.models import (
    EncounterBillingRecord,
    FacilityFeeScheduleOverride,
    OrganizationFeeSchedule,
    OrganizationFeeScheduleItem,
)
from clinical.models import Encounter, ProgressNote
from facilities.models import (
    AppointmentStatus,
    AppointmentType,
    Facility,
    Staff,
    StaffRole,
)
from organizations.models import Organization, OrganizationMembership
from patients.models import Patient

User = get_user_model()


class EncounterBillingRecordViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.organization = Organization.objects.create(
            name="CareFlow Health",
            slug="careflow-health",
        )
        self.user = User.objects.create_user(
            username="admin",
            password="testpass123",
            email="admin@example.com",
            first_name="Care",
            last_name="Admin",
        )
        OrganizationMembership.objects.create(
            user=self.user,
            organization=self.organization,
            role=OrganizationMembership.ROLE_ADMIN,
            is_active=True,
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Main Clinic",
            timezone="America/Los_Angeles",
        )
        self.other_facility = Facility.objects.create(
            organization=self.organization,
            name="North Clinic",
            timezone="America/New_York",
        )
        self.staff = Staff.objects.create(
            user=self.user,
            facility=self.facility,
            role=StaffRole.objects.get(facility=self.facility, code="admin"),
            title=self.facility.titles.get(code="md"),
            is_active=True,
            is_default=True,
        )

        self.gender = self.facility.patient_genders.first()
        self.patient = Patient.objects.create(
            facility=self.facility,
            first_name="Mia",
            last_name="Martinez",
            date_of_birth=date(1990, 4, 1),
            gender=self.gender,
        )
        self.status = AppointmentStatus.objects.get(
            facility=self.facility,
            code="pending",
        )
        self.appointment_type = AppointmentType.objects.get(
            facility=self.facility,
            code="follow_up",
        )
        facility_tz = ZoneInfo(str(self.facility.timezone))
        self.appointment = Appointment.objects.create(
            patient=self.patient,
            rendering_provider=self.staff,
            appointment_time=datetime(2026, 4, 22, 9, 0, tzinfo=facility_tz),
            room="101",
            reason="Follow up",
            status=self.status,
            appointment_type=self.appointment_type,
            facility=self.facility,
            created_by=self.user,
        )

        self.client.force_authenticate(self.user)

    def create_staff_user(self, username, facility, role_code="staff"):
        user = User.objects.create_user(
            username=username,
            password="testpass123",
            email=f"{username}@example.com",
        )
        OrganizationMembership.objects.create(
            user=user,
            organization=self.organization,
            role=OrganizationMembership.ROLE_MEMBER,
            is_active=True,
        )
        staff = Staff.objects.create(
            user=user,
            facility=facility,
            role=StaffRole.objects.get(facility=facility, code=role_code),
            title=facility.titles.get(code="md"),
            is_active=True,
        )
        return user, staff

    def create_encounter(self, signed=True, patient=None, facility=None):
        facility = facility or self.facility
        patient = patient or self.patient
        appointment = self.appointment if patient == self.patient else None
        encounter = Encounter.objects.create(
            patient=patient,
            facility=facility,
            appointment=appointment,
            rendering_provider=self.staff if facility == self.facility else None,
            reason="Follow up",
            created_by=self.user,
        )
        note = ProgressNote.objects.create(
            encounter=encounter,
            created_by=self.user,
            subjective="Doing well.",
            objective="Vitals reviewed.",
            assessment="Stable chronic condition.",
            plan="Continue plan.",
        )
        if signed:
            note.sign(self.user)
            encounter.refresh_from_db()
        return encounter

    def create_billing_record(self, encounter=None):
        encounter = encounter or self.create_encounter()
        return EncounterBillingRecord.objects.create(
            encounter=encounter,
            payer_name="United Community Plan",
            created_by=self.user,
            updated_by=self.user,
        )

    def test_unauthenticated_access_is_rejected(self):
        client = APIClient()
        response = client.get(
            "/v1/billing/encounter-billing-records/",
            {"facility_id": self.facility.id, "patient_id": self.patient.id},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 401)

    def test_create_billing_record_for_signed_encounter(self):
        encounter = self.create_encounter()

        response = self.client.post(
            f"/v1/billing/encounter-billing-records/?facility_id={self.facility.id}",
            {
                "encounter": encounter.id,
                "status": "ready_to_submit",
                "payer_name": "United Community Plan",
                "place_of_service": "11",
                "diagnoses": [
                    {
                        "code": "e11.9",
                        "description": "Type 2 diabetes mellitus",
                    }
                ],
                "charge_lines": [
                    {
                        "service_code": "99213",
                        "description": "Office outpatient visit",
                        "units": "1.00",
                        "charge_amount": "125.00",
                        "diagnosis_pointers": [1],
                    }
                ],
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["patient"], self.patient.id)
        self.assertEqual(response.data["facility"], self.facility.id)
        self.assertEqual(response.data["encounter_status"], "signed")
        self.assertEqual(response.data["diagnoses"][0]["code"], "E11.9")
        self.assertEqual(response.data["charge_lines"][0]["service_code"], "99213")
        self.assertEqual(response.data["total_charge_amount"], "125.00")
        self.assertTrue(
            AuditEvent.objects.filter(
                app_label="billing",
                model_name="encounterbillingrecord",
                object_pk=str(response.data["id"]),
                action="create",
            ).exists()
        )

    def test_create_rejects_unsigned_encounter(self):
        encounter = self.create_encounter(signed=False)

        response = self.client.post(
            f"/v1/billing/encounter-billing-records/?facility_id={self.facility.id}",
            {
                "encounter": encounter.id,
                "payer_name": "United Community Plan",
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["encounter"][0],
            "Only signed encounters can be sent to billing.",
        )

    def test_ready_to_submit_requires_diagnosis_and_charge_line(self):
        encounter = self.create_encounter()

        response = self.client.post(
            f"/v1/billing/encounter-billing-records/?facility_id={self.facility.id}",
            {
                "encounter": encounter.id,
                "status": "ready_to_submit",
                "payer_name": "United Community Plan",
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["diagnoses"][0],
            "Add at least one diagnosis before submission.",
        )
        self.assertEqual(
            response.data["charge_lines"][0],
            "Add at least one service line before submission.",
        )

    def test_update_replaces_charge_capture_lines(self):
        billing_record = self.create_billing_record()

        response = self.client.patch(
            f"/v1/billing/encounter-billing-records/{billing_record.id}/?facility_id={self.facility.id}",
            {
                "status": "ready_to_submit",
                "diagnoses": [{"code": "I10", "description": "Essential hypertension"}],
                "charge_lines": [
                    {
                        "service_code": "99214",
                        "units": "1.00",
                        "charge_amount": "175.00",
                        "diagnosis_pointers": [1],
                    },
                    {
                        "service_code": "36415",
                        "units": "1.00",
                        "charge_amount": "20.00",
                        "diagnosis_pointers": [1],
                    },
                ],
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ready_to_submit")
        self.assertEqual(len(response.data["charge_lines"]), 2)
        self.assertEqual(response.data["total_charge_amount"], "195.00")

        billing_record.refresh_from_db()
        self.assertEqual(billing_record.charge_lines.count(), 2)
        self.assertTrue(
            AuditEvent.objects.filter(
                app_label="billing",
                model_name="encounterbillingrecord",
                object_pk=str(billing_record.pk),
                action="update",
            ).exists()
        )

    def test_billing_manage_permission_is_required_for_mutations(self):
        physician_user, _ = self.create_staff_user(
            "physician",
            self.facility,
            "physician",
        )
        encounter = self.create_encounter()
        self.client.force_authenticate(physician_user)

        list_response = self.client.get(
            "/v1/billing/encounter-billing-records/",
            {"facility_id": self.facility.id, "patient_id": self.patient.id},
            HTTP_HOST="localhost:8000",
        )
        create_response = self.client.post(
            f"/v1/billing/encounter-billing-records/?facility_id={self.facility.id}",
            {"encounter": encounter.id},
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(create_response.status_code, 403)

    def test_biller_can_manage_without_clinical_view_permission(self):
        biller_user, _ = self.create_staff_user(
            "biller",
            self.facility,
            "biller",
        )
        encounter = self.create_encounter()
        self.client.force_authenticate(biller_user)

        response = self.client.post(
            f"/v1/billing/encounter-billing-records/?facility_id={self.facility.id}",
            {
                "encounter": encounter.id,
                "payer_name": "United Community Plan",
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["encounter"], encounter.id)

    def test_biller_cannot_manage_fee_schedule_configuration(self):
        biller_user, _ = self.create_staff_user(
            "fee_config_biller",
            self.facility,
            "biller",
        )
        self.client.force_authenticate(biller_user)

        response = self.client.get(
            "/v1/billing/facility-fee-schedules/",
            {"facility_id": self.facility.id},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 403)

    def test_cross_facility_detail_access_is_rejected(self):
        other_patient = Patient.objects.create(
            facility=self.other_facility,
            first_name="Noah",
            last_name="North",
            date_of_birth=date(1984, 8, 8),
            gender=self.other_facility.patient_genders.first(),
        )
        other_encounter = self.create_encounter(
            patient=other_patient,
            facility=self.other_facility,
        )
        billing_record = EncounterBillingRecord.objects.create(
            encounter=other_encounter,
            payer_name="Other payer",
            created_by=self.user,
            updated_by=self.user,
        )

        response = self.client.get(
            f"/v1/billing/encounter-billing-records/{billing_record.id}/",
            {"facility_id": self.facility.id},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.data["detail"],
            "You do not have access to this billing record.",
        )

    def test_effective_fee_schedule_merges_org_defaults_and_facility_overrides(self):
        org_item = OrganizationFeeScheduleItem.objects.create(
            organization=self.organization,
            service_code="99214",
            description="Office visit",
            charge_amount="165.00",
            created_by=self.user,
            updated_by=self.user,
        )
        OrganizationFeeScheduleItem.objects.create(
            organization=self.organization,
            service_code="36415",
            description="Venipuncture",
            charge_amount="20.00",
            created_by=self.user,
            updated_by=self.user,
        )
        FacilityFeeScheduleOverride.objects.create(
            facility=self.facility,
            organization_item=org_item,
            charge_amount="175.00",
            created_by=self.user,
            updated_by=self.user,
        )
        FacilityFeeScheduleOverride.objects.create(
            facility=self.facility,
            service_code="99490",
            description="Chronic care management",
            charge_amount="95.00",
            created_by=self.user,
            updated_by=self.user,
        )

        response = self.client.get(
            "/v1/billing/fee-schedule-items/",
            {"facility_id": self.facility.id},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        by_code = {item["service_code"]: item for item in response.data}
        self.assertEqual(by_code["99214"]["charge_amount"], "175.00")
        self.assertEqual(by_code["99214"]["catalog_source"], "facility_override")
        self.assertEqual(by_code["36415"]["catalog_source"], "organization")
        self.assertEqual(by_code["99490"]["catalog_source"], "facility")

    def test_fee_schedule_rejects_cross_facility_access(self):
        other_user, _ = self.create_staff_user(
            "other_biller",
            self.other_facility,
            "biller",
        )
        self.client.force_authenticate(other_user)

        response = self.client.get(
            "/v1/billing/fee-schedule-items/",
            {"facility_id": self.facility.id},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 403)

    def test_organization_fee_schedule_sheet_can_be_created(self):
        response = self.client.post(
            "/v1/billing/organization-fee-schedules/",
            {
                "name": "Commercial Contracted Rates",
                "code": "commercial",
                "is_active": True,
            },
            format="json",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["name"], "Commercial Contracted Rates")
        self.assertEqual(response.data["item_count"], 0)
        self.assertIn("linked_entities", response.data)

    def test_fee_schedule_sheets_allow_different_prices_for_same_code(self):
        standard_schedule = OrganizationFeeSchedule.objects.create(
            organization=self.organization,
            name="Standard Fee Schedule",
            code="standard",
            is_default=True,
            created_by=self.user,
            updated_by=self.user,
        )
        payer_schedule = OrganizationFeeSchedule.objects.create(
            organization=self.organization,
            name="Commercial Contracted Rates",
            code="commercial",
            created_by=self.user,
            updated_by=self.user,
        )

        OrganizationFeeScheduleItem.objects.create(
            organization=self.organization,
            schedule=standard_schedule,
            service_code="99214",
            description="Office visit",
            charge_amount="165.00",
            created_by=self.user,
            updated_by=self.user,
        )
        OrganizationFeeScheduleItem.objects.create(
            organization=self.organization,
            schedule=payer_schedule,
            service_code="99214",
            description="Office visit commercial",
            charge_amount="140.00",
            created_by=self.user,
            updated_by=self.user,
        )

        response = self.client.get(
            "/v1/billing/organization-fee-schedule-items/",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(
            {item["charge_amount"] for item in response.data},
            {"165.00", "140.00"},
        )

    def test_fee_schedule_resolution_payer_beats_staff_beats_facility(self):
        from insurance.models import (
            InsuranceCarrier,
            OrganizationInsuranceCarrierPreference,
        )

        default_schedule = OrganizationFeeSchedule.objects.create(
            organization=self.organization,
            name="Default",
            code="default",
            is_default=True,
            created_by=self.user,
            updated_by=self.user,
        )
        staff_schedule = OrganizationFeeSchedule.objects.create(
            organization=self.organization,
            name="Staff Sheet",
            code="staff-sheet",
            created_by=self.user,
            updated_by=self.user,
        )
        payer_schedule = OrganizationFeeSchedule.objects.create(
            organization=self.organization,
            name="Payer Sheet",
            code="payer-sheet",
            created_by=self.user,
            updated_by=self.user,
        )

        OrganizationFeeScheduleItem.objects.create(
            organization=self.organization,
            schedule=default_schedule,
            service_code="99213",
            description="Default visit",
            charge_amount="100.00",
            created_by=self.user,
        )
        OrganizationFeeScheduleItem.objects.create(
            organization=self.organization,
            schedule=staff_schedule,
            service_code="99213",
            description="Staff visit",
            charge_amount="120.00",
            created_by=self.user,
        )
        OrganizationFeeScheduleItem.objects.create(
            organization=self.organization,
            schedule=payer_schedule,
            service_code="99213",
            description="Payer visit",
            charge_amount="90.00",
            created_by=self.user,
        )

        self.staff.fee_schedule = staff_schedule
        Staff.objects.filter(pk=self.staff.pk).update(fee_schedule=staff_schedule)
        self.staff.refresh_from_db()

        carrier = InsuranceCarrier.objects.create(name="Test Carrier")
        payer_pref = OrganizationInsuranceCarrierPreference.objects.create(
            organization=self.organization,
            carrier=carrier,
            fee_schedule=payer_schedule,
        )

        response_default = self.client.get(
            "/v1/billing/fee-schedule-items/",
            {"facility_id": self.facility.id},
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(response_default.data[0]["charge_amount"], "100.00")

        response_staff = self.client.get(
            "/v1/billing/fee-schedule-items/",
            {"facility_id": self.facility.id, "staff_id": self.staff.id},
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(response_staff.data[0]["charge_amount"], "120.00")

        response_payer = self.client.get(
            "/v1/billing/fee-schedule-items/",
            {
                "facility_id": self.facility.id,
                "staff_id": self.staff.id,
                "payer_preference_id": payer_pref.id,
            },
            HTTP_HOST="localhost:8000",
        )
        self.assertEqual(response_payer.data[0]["charge_amount"], "90.00")
