import random
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db.models import Count
from django.utils import timezone

from allergies.models import PatientAllergy
from appointments.models import Appointment
from billing.cpt_catalog import get_catalog_entries
from billing.models import (
    EncounterBillingRecord,
    EncounterChargeLine,
    EncounterDiagnosis,
    FacilityFeeScheduleOverride,
    OrganizationFeeSchedule,
    OrganizationFeeScheduleItem,
)
from clinical.models import Encounter, ProgressNote, Vitals
from facilities.models import (
    AppointmentStatus,
    AppointmentType,
    Facility,
    FacilityResource,
    PatientGender,
    Staff,
    StaffRole,
    StaffTitle,
)
from insurance.models import (
    FacilityInsuranceCarrierOverride,
    InsuranceCarrier,
    OrganizationInsuranceCarrierPreference,
    PatientInsurancePolicy,
)
from medications.models import Medication, RefillRequest
from messaging.models import Message, MessageThread
from organizations.models import (
    Organization,
    OrganizationMembership,
    OrganizationPharmacyPreference,
)
from patients.document_storage import get_patient_document_storage
from patients.models import (
    CareProvider,
    Patient,
    PatientDocument,
    PatientEmergencyContact,
    PatientPharmacy,
    PatientPhone,
    Pharmacy,
    ensure_default_document_categories,
)
from patients.pharmacy_access import get_effective_pharmacy_ids
from patients.sample_documents import SAMPLE_DOCUMENTS, save_sample_pdf
from shared.models import Address
from users.demo_access import ensure_demo_user_full_access
from users.portal import PatientPortalAccount

User = get_user_model()


class Command(BaseCommand):
    help = "Seed demo data for CareFlow"

    def handle(self, *args, **kwargs):
        random.seed(42)
        self.stdout.write("Seeding demo data...")

        # -----------------------------
        # Organization
        # -----------------------------
        org, _ = Organization.objects.get_or_create(
            slug="careflow-demo",
            defaults={
                "name": "CareFlow Demo Organization",
                "legal_name": "CareFlow Demo Medical Group, PLLC",
                "phone_number": "(212) 555-0100",
                "email": "ops@careflow.xinyiklin.com",
                "website": "https://careflow-demo.local",
                "tax_id": "12-3456789",
                "notes": "Demo organization used for local development and QA workflows.",
            },
        )
        org.name = "CareFlow Demo Organization"
        org.legal_name = "CareFlow Demo Medical Group, PLLC"
        org.phone_number = "(212) 555-0100"
        org.email = "ops@careflow.xinyiklin.com"
        org.website = "https://careflow-demo.local"
        org.tax_id = "12-3456789"
        org.notes = "Demo organization used for local development and QA workflows."
        if not org.address_id:
            org.address = Address.objects.create(
                line_1="100 CareFlow Plaza",
                city="New York",
                state="NY",
                zip_code="10001",
            )
        org.save()

        # -----------------------------
        # Users
        # -----------------------------
        def create_user(username, email, first_name, last_name, password="Admin123!"):
            is_demo_admin = username == getattr(settings, "DEMO_USERNAME", "demo")

            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": email,
                    "first_name": first_name,
                    "last_name": last_name,
                    "is_active": True,
                    "is_staff": is_demo_admin,
                    "is_superuser": is_demo_admin,
                },
            )

            # Keep demo users consistent every time
            user.email = email
            user.first_name = first_name
            user.last_name = last_name
            user.is_active = True
            user.is_staff = is_demo_admin
            user.is_superuser = is_demo_admin
            user.set_password(password)
            user.save()

            status_msg = "Created" if created else "Updated/Reset"
            self.stdout.write(
                f"  - {status_msg} user: {username} (Admin: {is_demo_admin})"
            )
            return user

        admin_user = create_user(
            getattr(settings, "DEMO_USERNAME", "demo"),
            "demo@careflow.xinyiklin.com",
            "Demo",
            "User",
        )
        doctor_user = create_user(
            "demo_doctor", "doctor@careflow.xinyiklin.com", "Elliot", "Reed"
        )
        doctor2_user = create_user(
            "demo_doctor2", "doctor2@careflow.xinyiklin.com", "Nadia", "Solano"
        )
        nurse_user = create_user(
            "demo_nurse", "nurse@careflow.xinyiklin.com", "Theo", "Park"
        )
        staff_user = create_user(
            "demo_staff", "staff@careflow.xinyiklin.com", "Iris", "Cole"
        )
        staff2_user = create_user(
            "demo_staff2", "staff2@careflow.xinyiklin.com", "Jonah", "Vale"
        )
        facility_admin_user = create_user(
            "demo_facility_admin",
            "facilityadmin@careflow.xinyiklin.com",
            "Amara",
            "Stone",
        )

        # -----------------------------
        # Organization memberships
        # -----------------------------
        membership_map = {
            admin_user: "owner",
            facility_admin_user: "admin",
            doctor_user: "member",
            doctor2_user: "member",
            nurse_user: "member",
            staff_user: "member",
            staff2_user: "member",
        }

        for user, role in membership_map.items():
            membership, created = OrganizationMembership.objects.get_or_create(
                user=user,
                defaults={
                    "organization": org,
                    "role": role,
                    "is_active": True,
                },
            )
            if not created:
                membership.organization = org
                membership.role = role
                membership.is_active = True
                membership.save()

        # -----------------------------
        # Facilities
        # -----------------------------
        facility_specs = [
            {
                "name": "Clinic A",
                "timezone": "America/New_York",
                "facility_code": "A",
                "phone_number": "(212) 555-1001",
                "fax_number": "(212) 555-1002",
                "email": "clinic-a@careflow.xinyiklin.com",
                "operating_start_time": time(8, 0),
                "operating_end_time": time(17, 0),
                "operating_days": [1, 2, 3, 4, 5],
                "address": {
                    "line_1": "184 Linden Avenue",
                    "city": "New York",
                    "state": "NY",
                    "zip_code": "10001",
                },
                "notes": "Seeded demo clinic for local development workflows.",
            },
            {
                "name": "Clinic B",
                "timezone": "America/New_York",
                "facility_code": "B",
                "phone_number": "(718) 555-2001",
                "fax_number": "(718) 555-2002",
                "email": "clinic-b@careflow.xinyiklin.com",
                "operating_start_time": time(9, 0),
                "operating_end_time": time(18, 0),
                "operating_days": [1, 2, 3, 4, 5],
                "address": {
                    "line_1": "72 Maple Court",
                    "city": "Queens",
                    "state": "NY",
                    "zip_code": "11101",
                },
                "notes": "Seeded demo clinic for local development workflows.",
            },
            {
                "name": "Clinic C",
                "timezone": "America/New_York",
                "facility_code": "C",
                "phone_number": "(646) 555-3001",
                "fax_number": "(646) 555-3002",
                "email": "clinic-c@careflow.xinyiklin.com",
                "operating_start_time": time(8, 30),
                "operating_end_time": time(16, 30),
                "operating_days": [1, 2, 3, 4],
                "address": {
                    "line_1": "309 Cedar Street",
                    "city": "New York",
                    "state": "NY",
                    "zip_code": "10007",
                },
                "notes": "Seeded demo clinic for local development workflows.",
            },
        ]

        facilities = []
        for spec in facility_specs:
            facility, created = Facility.objects.get_or_create(
                organization=org,
                name=spec["name"],
                defaults={"timezone": spec["timezone"]},
            )
            if not created and str(facility.timezone) != spec["timezone"]:
                facility.timezone = spec["timezone"]
            facility.facility_code = spec["facility_code"]
            facility.phone_number = spec["phone_number"]
            facility.fax_number = spec["fax_number"]
            facility.email = spec["email"]
            facility.operating_start_time = spec["operating_start_time"]
            facility.operating_end_time = spec["operating_end_time"]
            facility.operating_days = spec["operating_days"]
            facility.notes = spec["notes"]
            if not facility.address_id:
                facility.address = Address.objects.create(**spec["address"])
            facility.save()

            facilities.append(facility)
            self.stdout.write(
                f"  - {'Created' if created else 'Found'} facility: {facility.name}"
            )

        # -----------------------------
        # Helpers
        # -----------------------------
        def get_role(facility, preferred_codes):
            for code in preferred_codes:
                role = StaffRole.objects.filter(facility=facility, code=code).first()
                if role:
                    return role
            raise ValueError(
                f"No matching role found in {facility.name} for codes {preferred_codes}"
            )

        def get_title(facility, preferred_codes):
            for code in preferred_codes:
                title = StaffTitle.objects.filter(facility=facility, code=code).first()
                if title:
                    return title
            return None

        def ensure_staff(user, facility, role, title=None, is_default=False):
            staff, created = Staff.objects.get_or_create(
                user=user,
                facility=facility,
                defaults={
                    "role": role,
                    "title": title,
                    "is_active": True,
                    "is_default": is_default,
                },
            )

            if not created:
                staff.role = role
                staff.title = title
                staff.is_active = True
                if is_default:
                    staff.is_default = True
                staff.save()
            return staff

        # -----------------------------
        # Staff memberships across facilities
        # -----------------------------
        clinic_a, clinic_b, clinic_c = facilities

        # Clinic A roles/titles
        clinic_a_admin_role = get_role(clinic_a, ["admin", "staff"])
        clinic_a_physician_role = get_role(clinic_a, ["physician"])
        clinic_a_nurse_role = get_role(clinic_a, ["nurse"])
        clinic_a_staff_role = get_role(clinic_a, ["staff"])
        clinic_a_md_title = get_title(clinic_a, ["md"])
        clinic_a_rn_title = get_title(clinic_a, ["rn"])
        clinic_a_mgr_title = get_title(clinic_a, ["mgr", "manager"])

        # Clinic B roles/titles
        clinic_b_admin_role = get_role(clinic_b, ["admin", "staff"])
        clinic_b_physician_role = get_role(clinic_b, ["physician"])
        clinic_b_staff_role = get_role(clinic_b, ["staff"])
        clinic_b_md_title = get_title(clinic_b, ["md"])
        clinic_b_mgr_title = get_title(clinic_b, ["mgr", "manager"])

        # Clinic C roles/titles
        clinic_c_admin_role = get_role(clinic_c, ["admin", "staff"])
        clinic_c_physician_role = get_role(clinic_c, ["physician"])
        clinic_c_nurse_role = get_role(clinic_c, ["nurse"])
        clinic_c_staff_role = get_role(clinic_c, ["staff"])
        clinic_c_md_title = get_title(clinic_c, ["md"])
        clinic_c_rn_title = get_title(clinic_c, ["rn"])
        clinic_c_mgr_title = get_title(clinic_c, ["mgr", "manager"])

        # Admin / cross-facility users
        ensure_staff(
            admin_user,
            clinic_a,
            clinic_a_admin_role,
            clinic_a_mgr_title,
            is_default=True,
        )
        ensure_staff(admin_user, clinic_b, clinic_b_admin_role, clinic_b_mgr_title)
        ensure_staff(admin_user, clinic_c, clinic_c_admin_role, clinic_c_mgr_title)

        ensure_staff(
            facility_admin_user,
            clinic_b,
            clinic_b_admin_role,
            clinic_b_mgr_title,
            is_default=True,
        )
        ensure_staff(
            facility_admin_user, clinic_a, clinic_a_admin_role, clinic_a_mgr_title
        )

        ensure_demo_user_full_access(admin_user)

        # Providers and staff spread across facilities
        ensure_staff(
            doctor_user,
            clinic_a,
            clinic_a_physician_role,
            clinic_a_md_title,
            is_default=True,
        )
        ensure_staff(doctor_user, clinic_b, clinic_b_physician_role, clinic_b_md_title)

        ensure_staff(
            doctor2_user,
            clinic_c,
            clinic_c_physician_role,
            clinic_c_md_title,
            is_default=True,
        )
        ensure_staff(
            doctor2_user,
            clinic_a,
            clinic_a_physician_role,
            clinic_a_md_title,
        )

        ensure_staff(
            nurse_user,
            clinic_a,
            clinic_a_nurse_role,
            clinic_a_rn_title,
            is_default=True,
        )
        ensure_staff(nurse_user, clinic_c, clinic_c_nurse_role, clinic_c_rn_title)

        ensure_staff(staff_user, clinic_a, clinic_a_staff_role, None, is_default=True)
        ensure_staff(staff_user, clinic_b, clinic_b_staff_role, None)

        ensure_staff(staff2_user, clinic_c, clinic_c_staff_role, None, is_default=True)
        ensure_staff(staff2_user, clinic_b, clinic_b_staff_role, None)

        self.stdout.write("  - Staff memberships created across multiple facilities")

        # -----------------------------
        # Patients + Appointments per facility
        # -----------------------------
        first_names = [
            "John",
            "Jane",
            "Mike",
            "Emily",
            "Chris",
            "Sarah",
            "David",
            "Anna",
            "Kevin",
            "Laura",
            "Brian",
            "Olivia",
            "Daniel",
            "Sophia",
            "James",
            "Grace",
            "Leo",
            "Ava",
            "Noah",
            "Mia",
            "Liam",
            "Emma",
        ]
        last_names = [
            "Smith",
            "Johnson",
            "Lee",
            "Brown",
            "Davis",
            "Wilson",
            "Martinez",
            "Anderson",
            "Thomas",
            "Moore",
            "Jackson",
            "Martin",
            "White",
            "Clark",
            "Young",
            "Harris",
        ]

        reasons = [
            "Routine follow-up",
            "New patient visit",
            "Annual exam",
            "Medication review",
            "Blood pressure check",
            "Lab review",
            "Consultation",
            "Post-op follow-up",
            "Diabetes management",
            "Vaccination visit",
        ]

        today = timezone.localdate()

        def demo_phone_number(facility, patient_index):
            facility_digit = int(facility.id or 1) % 10
            return f"555-01{facility_digit}-{patient_index:04d}"

        def demo_demographics(patient_index):
            race_values = [
                "american_indian_or_alaska_native",
                "asian",
                "black_or_african_american",
                "native_hawaiian_or_other_pacific_islander",
                "white",
                "other",
                "unknown",
            ]
            ethnicity_values = [
                "hispanic_or_latino",
                "not_hispanic_or_latino",
                "unknown",
            ]

            race_declined = patient_index % 11 == 0
            ethnicity_declined = patient_index % 13 == 0

            return {
                "race": (
                    ""
                    if race_declined or patient_index % 7 == 0
                    else random.choice(race_values)
                ),
                "race_declined": race_declined,
                "ethnicity": (
                    ""
                    if ethnicity_declined or patient_index % 8 == 0
                    else random.choice(ethnicity_values)
                ),
                "ethnicity_declined": ethnicity_declined,
            }

        def sync_patient_phone(patient, facility, patient_index):
            if patient_index % 7 == 0:
                # Keep a small incomplete-registration cohort for intake QA.
                PatientPhone.objects.filter(patient=patient).delete()
                return

            phone = (
                PatientPhone.objects.filter(patient=patient, label="cell")
                .order_by("id")
                .first()
            )
            if not phone:
                phone = PatientPhone(patient=patient, label="cell")
            phone.number = demo_phone_number(facility, patient_index)
            phone.is_primary = True
            phone.save()
            PatientPhone.objects.filter(patient=patient).exclude(pk=phone.pk).update(
                is_primary=False
            )

        def sync_emergency_contact(patient, patient_index):
            if patient_index % 5 == 0:
                PatientEmergencyContact.objects.filter(patient=patient).delete()
                patient.emergency_contact_name = ""
                patient.emergency_contact_relationship = ""
                patient.emergency_contact_phone = ""
                patient.save(
                    update_fields=[
                        "emergency_contact_name",
                        "emergency_contact_relationship",
                        "emergency_contact_phone",
                    ]
                )
                return

            contact_name = f"{patient.first_name} Contact"
            contact_phone = f"555-02{patient_index % 10}-{patient_index:04d}"
            contact = (
                PatientEmergencyContact.objects.filter(patient=patient)
                .order_by("id")
                .first()
            )
            if not contact:
                contact = PatientEmergencyContact(patient=patient)
            contact.name = contact_name
            contact.relationship = random.choice(
                ["Spouse", "Parent", "Sibling", "Caregiver"]
            )
            contact.phone_number = contact_phone
            contact.is_primary = True
            contact.notes = "Seeded emergency contact for registration QA."
            contact.save()
            PatientEmergencyContact.objects.filter(patient=patient).exclude(
                pk=contact.pk
            ).update(is_primary=False)
            patient.emergency_contact_name = contact.name
            patient.emergency_contact_relationship = contact.relationship
            patient.emergency_contact_phone = contact.phone_number
            patient.save(
                update_fields=[
                    "emergency_contact_name",
                    "emergency_contact_relationship",
                    "emergency_contact_phone",
                ]
            )

        patient_counts = {
            clinic_a.id: 30,
            clinic_b.id: 22,
            clinic_c.id: 24,
        }

        appointments_per_day = {
            clinic_a.id: 18,
            clinic_b.id: 12,
            clinic_c.id: 14,
        }

        carrier_specs = [
            {
                "name": "MetroPlus Gold",
                "payer_id": "MTP001",
                "phone_number": "(800) 555-4100",
                "website": "https://metroplus-demo.local",
                "address_line_1": "160 Water St",
                "address_line_2": "Floor 3",
                "city": "New York",
                "state": "NY",
                "zip_code": "10038",
            },
            {
                "name": "Empire Health",
                "payer_id": "EMP002",
                "phone_number": "(800) 555-4200",
                "website": "https://empire-demo.local",
                "address_line_1": "11 W 42nd St",
                "address_line_2": "",
                "city": "New York",
                "state": "NY",
                "zip_code": "10036",
            },
            {
                "name": "United Community Plan",
                "payer_id": "UCP003",
                "phone_number": "(800) 555-4300",
                "website": "https://community-demo.local",
                "address_line_1": "2950 Expressway Dr S",
                "address_line_2": "Suite 100",
                "city": "Islandia",
                "state": "NY",
                "zip_code": "11749",
            },
        ]

        carriers = []
        for carrier_spec in carrier_specs:
            carrier, _ = InsuranceCarrier.objects.get_or_create(
                name=carrier_spec["name"],
                defaults=carrier_spec,
            )
            carrier.payer_id = carrier_spec["payer_id"]
            carrier.phone_number = carrier_spec["phone_number"]
            carrier.website = carrier_spec["website"]
            carrier.address_line_1 = carrier_spec.get("address_line_1", "")
            carrier.address_line_2 = carrier_spec.get("address_line_2", "")
            carrier.city = carrier_spec.get("city", "")
            carrier.state = carrier_spec.get("state", "")
            carrier.zip_code = carrier_spec.get("zip_code", "")
            carrier.is_active = True
            carrier.save()
            carriers.append(carrier)

        for index, carrier in enumerate(carriers, start=1):
            OrganizationInsuranceCarrierPreference.objects.update_or_create(
                organization=org,
                carrier=carrier,
                defaults={
                    "is_preferred": True,
                    "is_hidden": False,
                    "is_active": True,
                    "sort_order": index * 10,
                },
            )

        standard_fee_schedule, _ = OrganizationFeeSchedule.objects.update_or_create(
            organization=org,
            code="standard",
            defaults={
                "name": "Standard Fee Schedule",
                "is_default": True,
                "is_active": True,
                "updated_by": admin_user,
            },
        )
        if not standard_fee_schedule.created_by_id:
            standard_fee_schedule.created_by = admin_user
            standard_fee_schedule.save(update_fields=["created_by"])

        fee_schedule_items = {}
        for sort_index, entry in enumerate(get_catalog_entries(), start=1):
            item, _ = OrganizationFeeScheduleItem.objects.update_or_create(
                organization=org,
                schedule=standard_fee_schedule,
                service_code=entry["service_code"],
                defaults={
                    "description": entry["description"],
                    "default_units": Decimal("1.00"),
                    "charge_amount": entry["charge_amount"],
                    "place_of_service": "11",
                    "is_active": True,
                    "sort_order": sort_index * 10,
                    "updated_by": admin_user,
                },
            )
            if not item.created_by_id:
                item.created_by = admin_user
                item.save(update_fields=["created_by"])
            fee_schedule_items[entry["service_code"]] = item

        medication_templates = [
            {
                "medication_name": "Lisinopril",
                "dose": "10 mg",
                "route": "Oral",
                "frequency": "Once daily",
                "notes": "Blood pressure management.",
            },
            {
                "medication_name": "Metformin ER",
                "dose": "500 mg",
                "route": "Oral",
                "frequency": "Twice daily with meals",
                "notes": "Review A1c at next chronic care visit.",
            },
            {
                "medication_name": "Atorvastatin",
                "dose": "20 mg",
                "route": "Oral",
                "frequency": "Nightly",
                "notes": "Lipid management.",
            },
            {
                "medication_name": "Albuterol HFA",
                "dose": "90 mcg",
                "route": "Inhaled",
                "frequency": "Two puffs every 4-6 hours as needed",
                "notes": "Rescue inhaler for intermittent wheezing.",
            },
        ]

        allergy_templates = [
            {
                "allergen": "Penicillin",
                "category": PatientAllergy.CATEGORY_MEDICATION,
                "reaction": "Hives and facial swelling",
                "severity": PatientAllergy.SEVERITY_SEVERE,
                "notes": "Avoid beta-lactam antibiotics unless reviewed.",
            },
            {
                "allergen": "Shellfish",
                "category": PatientAllergy.CATEGORY_FOOD,
                "reaction": "Diffuse rash and nausea",
                "severity": PatientAllergy.SEVERITY_MODERATE,
                "notes": "Patient carries OTC antihistamine.",
            },
            {
                "allergen": "Latex",
                "category": PatientAllergy.CATEGORY_LATEX,
                "reaction": "Contact dermatitis",
                "severity": PatientAllergy.SEVERITY_MILD,
                "notes": "Use non-latex supplies.",
            },
            {
                "allergen": "Iodinated contrast",
                "category": PatientAllergy.CATEGORY_CONTRAST,
                "reaction": "Shortness of breath",
                "severity": PatientAllergy.SEVERITY_SEVERE,
                "notes": "Requires clinician review before imaging with contrast.",
            },
        ]

        clinical_note_templates = [
            {
                "reason": "Hypertension follow-up",
                "subjective": "Patient reports taking medications consistently and denies chest pain or shortness of breath.",
                "objective": "Blood pressure improved compared with prior visit. No acute distress.",
                "assessment": "Essential hypertension, improving with current regimen.",
                "plan": "Continue current medication, reinforce low-sodium diet, and recheck blood pressure in 4 weeks.",
                "diagnosis": ("I10", "Essential hypertension"),
                "service": (
                    "99214",
                    "Established patient office visit, moderate complexity",
                    "165.00",
                ),
            },
            {
                "reason": "Diabetes management",
                "subjective": "Patient brought home glucose log and reports no hypoglycemic episodes.",
                "objective": "Foot exam normal. Labs reviewed with patient.",
                "assessment": "Type 2 diabetes mellitus without complication.",
                "plan": "Continue metformin, order A1c, and schedule nutrition follow-up.",
                "diagnosis": (
                    "E11.9",
                    "Type 2 diabetes mellitus without complications",
                ),
                "service": (
                    "99214",
                    "Established patient office visit, moderate complexity",
                    "165.00",
                ),
            },
            {
                "reason": "Upper respiratory symptoms",
                "subjective": "Patient reports cough and congestion for four days without fever.",
                "objective": "Lungs clear to auscultation. Oxygen saturation stable.",
                "assessment": "Acute upper respiratory infection, likely viral.",
                "plan": "Supportive care, hydration, and return precautions reviewed.",
                "diagnosis": (
                    "J06.9",
                    "Acute upper respiratory infection, unspecified",
                ),
                "service": (
                    "99213",
                    "Established patient office visit, low complexity",
                    "110.00",
                ),
            },
            {
                "reason": "Preventive exam",
                "subjective": "Patient presents for annual preventive visit with no acute concerns.",
                "objective": "Preventive screening and immunization history reviewed.",
                "assessment": "Routine adult health maintenance.",
                "plan": "Update preventive labs, review age-appropriate screening, and follow up annually.",
                "diagnosis": (
                    "Z00.00",
                    "Encounter for general adult medical examination",
                ),
                "service": (
                    "99395",
                    "Preventive medicine established patient visit",
                    "185.00",
                ),
            },
        ]

        def get_primary_payer_name(patient):
            policy = (
                PatientInsurancePolicy.objects.filter(
                    patient=patient,
                    is_active=True,
                )
                .select_related("carrier")
                .order_by("-is_primary", "coverage_order", "id")
                .first()
            )
            if not policy:
                return ""
            return policy.carrier.name or policy.plan_name or ""

        def seed_medications_for_patient(patient, patient_index, provider_name):
            if patient_index % 6 == 0:
                return

            active_template = medication_templates[
                patient_index % len(medication_templates)
            ]
            Medication.objects.create(
                patient=patient,
                facility=patient.facility,
                status=Medication.STATUS_ACTIVE,
                start_date=today - timedelta(days=90 + patient_index),
                prescriber_name=provider_name,
                created_by=admin_user,
                updated_by=admin_user,
                **active_template,
            )

            if patient_index % 4 == 0:
                historical_template = medication_templates[
                    (patient_index + 1) % len(medication_templates)
                ]
                Medication.objects.create(
                    patient=patient,
                    facility=patient.facility,
                    status=Medication.STATUS_DISCONTINUED,
                    start_date=today - timedelta(days=220 + patient_index),
                    end_date=today - timedelta(days=30 + patient_index),
                    prescriber_name=provider_name,
                    notes="Previously discontinued after medication reconciliation.",
                    created_by=admin_user,
                    updated_by=admin_user,
                    **{
                        key: value
                        for key, value in historical_template.items()
                        if key != "notes"
                    },
                )

        def seed_allergies_for_patient(patient, patient_index):
            if patient_index % 4 == 0:
                return

            allergy_template = allergy_templates[patient_index % len(allergy_templates)]
            PatientAllergy.objects.create(
                patient=patient,
                facility=patient.facility,
                onset_date=today - timedelta(days=365 + patient_index),
                status=PatientAllergy.STATUS_ACTIVE,
                created_by=admin_user,
                updated_by=admin_user,
                **allergy_template,
            )

            if patient_index % 9 == 0:
                PatientAllergy.objects.create(
                    patient=patient,
                    facility=patient.facility,
                    allergen="Seasonal pollen",
                    category=PatientAllergy.CATEGORY_ENVIRONMENTAL,
                    reaction="Rhinitis",
                    severity=PatientAllergy.SEVERITY_MILD,
                    onset_date=today - timedelta(days=800 + patient_index),
                    status=PatientAllergy.STATUS_RESOLVED,
                    notes="Historic seasonal symptoms, currently resolved.",
                    created_by=admin_user,
                    updated_by=admin_user,
                )

        def create_billing_record(encounter, template, sequence):
            status_cycle = [
                EncounterBillingRecord.STATUS_CODING_NEEDED,
                EncounterBillingRecord.STATUS_CODING_NEEDED,
                EncounterBillingRecord.STATUS_READY_TO_SUBMIT,
                EncounterBillingRecord.STATUS_CLAIM_CREATED,
            ]
            status = status_cycle[sequence % len(status_cycle)]
            payer_name = get_primary_payer_name(encounter.patient)
            place_of_service = "11"
            notes = "Seeded from signed progress note for billing workflow QA."

            if status == EncounterBillingRecord.STATUS_CODING_NEEDED:
                if sequence % 2 == 0:
                    payer_name = ""
                    notes = "Missing payer for attention-filter QA."
                elif sequence % 3 == 0:
                    place_of_service = ""
                    notes = "Missing place of service for billing QA."

            billing_record = EncounterBillingRecord.objects.create(
                encounter=encounter,
                status=status,
                payer_name=payer_name,
                place_of_service=place_of_service,
                notes=notes,
                created_by=admin_user,
                updated_by=admin_user,
            )

            if status != EncounterBillingRecord.STATUS_CODING_NEEDED or sequence % 2:
                diagnosis_code, diagnosis_description = template["diagnosis"]
                EncounterDiagnosis.objects.create(
                    billing_record=billing_record,
                    code=diagnosis_code,
                    description=diagnosis_description,
                    sequence=1,
                )

            if status != EncounterBillingRecord.STATUS_CODING_NEEDED:
                service_code, service_description, charge_amount = template["service"]
                EncounterChargeLine.objects.create(
                    billing_record=billing_record,
                    service_code=service_code,
                    description=service_description,
                    units=Decimal("1.00"),
                    charge_amount=Decimal(charge_amount),
                    diagnosis_pointers=[1],
                    sequence=1,
                )

            if sequence % 5 == 0:
                stale_at = timezone.now() - timedelta(days=8 + sequence)
                EncounterBillingRecord.objects.filter(pk=billing_record.pk).update(
                    updated_at=stale_at,
                )

            return billing_record

        def seed_clinical_flow_for_facility(facility, appointments):
            past_appointments = sorted(
                [
                    appointment
                    for appointment in appointments
                    if timezone.localtime(appointment.appointment_time).date() <= today
                ],
                key=lambda appointment: appointment.appointment_time,
                reverse=True,
            )

            for index, appointment in enumerate(past_appointments[:24], start=1):
                template = clinical_note_templates[
                    (index - 1) % len(clinical_note_templates)
                ]
                encounter = Encounter.objects.create(
                    patient=appointment.patient,
                    facility=facility,
                    appointment=appointment,
                    rendering_provider=appointment.rendering_provider,
                    reason=template["reason"],
                    started_at=appointment.appointment_time,
                    created_by=admin_user,
                )
                note = ProgressNote.objects.create(
                    encounter=encounter,
                    subjective=template["subjective"],
                    objective=template["objective"],
                    assessment=template["assessment"],
                    plan=template["plan"],
                    created_by=admin_user,
                )

                # Seed deterministic-but-varied vitals (skip every 5th visit so
                # the portal renders a "no vitals" state for some encounters).
                if index % 5 != 0:
                    Vitals.objects.create(
                        encounter=encounter,
                        height_cm=Decimal("170") + Decimal((index % 20) - 10),
                        weight_kg=Decimal("72") + Decimal((index * 3 % 25) - 10),
                        bp_systolic=110 + (index * 7 % 30),
                        bp_diastolic=68 + (index * 5 % 20),
                        heart_rate_bpm=64 + (index * 3 % 26),
                        respiratory_rate=14 + (index % 6),
                        temperature_c=Decimal("36.5")
                        + Decimal(index % 7) / Decimal("10"),
                        spo2_percent=96 + (index % 4),
                        pain_score=index % 5,
                        measured_at=appointment.appointment_time,
                        recorded_by=admin_user,
                    )

                if index % 4 == 0:
                    continue

                signed_at = appointment.end_time or (
                    appointment.appointment_time + timedelta(minutes=30)
                )
                if signed_at <= appointment.appointment_time:
                    signed_at = appointment.appointment_time + timedelta(minutes=30)
                encounter.ended_at = signed_at
                encounter.save(update_fields=["ended_at", "updated_at"])
                note.sign(admin_user)
                ProgressNote.objects.filter(pk=note.pk).update(signed_at=signed_at)
                Encounter.objects.filter(pk=encounter.pk).update(
                    ended_at=signed_at,
                    started_at=appointment.appointment_time,
                )

                if index % 3 != 0:
                    create_billing_record(encounter, template, index)

        for facility in facilities:
            statuses = list(
                AppointmentStatus.objects.filter(facility=facility, is_active=True)
            )
            types = list(
                AppointmentType.objects.filter(facility=facility, is_active=True)
            )
            genders = list(
                PatientGender.objects.filter(facility=facility, is_active=True)
            )

            if not statuses or not types or not genders:
                self.stdout.write(
                    self.style.WARNING(
                        f"  - Skipping {facility.name}: missing seeded config data"
                    )
                )
                continue

            ensure_default_document_categories(facility)

            # Clear existing demo appointments for facility for consistency
            Appointment.objects.filter(facility=facility).delete()

            facility_staff = list(
                Staff.objects.filter(facility=facility, is_active=True).select_related(
                    "user",
                    "role",
                )
            )
            provider_staff = [
                staff
                for staff in facility_staff
                if staff.role and staff.role.code == "physician"
            ]

            for staff in provider_staff:
                CareProvider.objects.get_or_create(
                    facility=facility,
                    linked_staff=staff,
                    defaults={
                        "first_name": staff.user.first_name,
                        "last_name": staff.user.last_name,
                        "organization_name": facility.name,
                        "specialty": "Internal Medicine",
                        "phone_number": facility.phone_number,
                        "fax_number": facility.fax_number,
                        "notes": "Seeded from active physician staff membership.",
                    },
                )

            external_pcp, _ = CareProvider.objects.get_or_create(
                facility=facility,
                first_name="Pat",
                last_name="Care",
                organization_name=f"{facility.name} Medical Group",
                specialty="Primary Care",
                defaults={
                    "phone_number": facility.phone_number,
                    "fax_number": facility.fax_number,
                    "npi": f"{facility.id:010d}",
                },
            )

            external_referrer, _ = CareProvider.objects.get_or_create(
                facility=facility,
                first_name="Riley",
                last_name="Referral",
                organization_name=f"{facility.name} Referral Network",
                specialty="Referring",
                defaults={
                    "phone_number": facility.phone_number,
                    "fax_number": facility.fax_number,
                    "npi": f"{facility.id + 1000:010d}",
                },
            )

            pharmacy, _ = Pharmacy.objects.get_or_create(
                name=f"{facility.name} Pharmacy",
                defaults={
                    "phone_number": facility.phone_number,
                    "fax_number": facility.fax_number,
                    "notes": "Preferred seeded pharmacy for demo patients.",
                },
            )
            if not pharmacy.address_id:
                pharmacy.address = Address.objects.create(
                    line_1=(
                        f"{facility.address.line_1} Suite 100"
                        if facility.address
                        else "1 Demo Pharmacy Way"
                    ),
                    city=facility.address.city if facility.address else "New York",
                    state=facility.address.state if facility.address else "NY",
                    zip_code=facility.address.zip_code if facility.address else "10001",
                )
                pharmacy.save()
            OrganizationPharmacyPreference.objects.get_or_create(
                organization=facility.organization,
                pharmacy=pharmacy,
                defaults={
                    "is_preferred": True,
                    "is_active": True,
                },
            )

            if facility == clinic_b:
                FacilityFeeScheduleOverride.objects.update_or_create(
                    facility=facility,
                    organization_item=fee_schedule_items["99214"],
                    defaults={
                        "charge_amount": Decimal("175.00"),
                        "is_active": True,
                        "sort_order": 20,
                        "updated_by": admin_user,
                    },
                )
            if facility == clinic_c:
                empire_preference = (
                    OrganizationInsuranceCarrierPreference.objects.filter(
                        organization=org,
                        carrier__name="Empire Health",
                    ).first()
                )
                if empire_preference:
                    FacilityInsuranceCarrierOverride.objects.update_or_create(
                        facility=facility,
                        organization_preference=empire_preference,
                        defaults={
                            "is_preferred": False,
                            "is_hidden": True,
                            "is_active": False,
                            "notes": "Hidden in this demo facility to exercise catalog overrides.",
                        },
                    )
                FacilityFeeScheduleOverride.objects.update_or_create(
                    facility=facility,
                    service_code="99490",
                    defaults={
                        "description": "Chronic care management, first 20 minutes",
                        "default_units": Decimal("1.00"),
                        "charge_amount": Decimal("95.00"),
                        "place_of_service": "11",
                        "is_active": True,
                        "sort_order": 50,
                        "updated_by": admin_user,
                    },
                )

            patients = []
            used_patient_keys = set()

            target_patient_count = patient_counts[facility.id]

            def build_demo_ssn(last4=None):
                last4_digits = "".join(
                    char for char in str(last4 or "") if char.isdigit()
                )
                if len(last4_digits) != 4:
                    last4_digits = f"{random.randint(0, 9999):04d}"
                return f"{random.randint(10000, 99999):05d}{last4_digits}"

            def normalize_demo_patient_ssn(patient):
                patient_ssn_digits = "".join(
                    char for char in str(patient.ssn or "") if char.isdigit()
                )
                if len(patient_ssn_digits) != 9:
                    patient.ssn = build_demo_ssn(patient.ssn_last4)
                else:
                    patient.ssn = patient_ssn_digits
                patient.ssn_last4 = patient.ssn[-4:]

            while len(patients) < target_patient_count:
                first_name = random.choice(first_names)
                last_name = random.choice(last_names)
                dob = datetime(
                    random.randint(1955, 2015),
                    random.randint(1, 12),
                    random.randint(1, 28),
                ).date()

                key = (facility.id, first_name, last_name, dob)
                if key in used_patient_keys:
                    continue
                used_patient_keys.add(key)

                patient_index = len(patients) + 1
                demo_ssn = build_demo_ssn()
                demographic_defaults = demo_demographics(patient_index)
                patient, _ = Patient.objects.get_or_create(
                    facility=facility,
                    first_name=first_name,
                    last_name=last_name,
                    date_of_birth=dob,
                    defaults={
                        "gender": random.choice(genders),
                        "middle_name": random.choice(["A", "J", "M", ""]),
                        "preferred_name": first_name,
                        "sex_at_birth": random.choice(
                            ["female", "male", "unknown", "undisclosed"]
                        ),
                        "preferred_language": random.choice(
                            ["English", "Spanish", "Mandarin", "Bengali"]
                        ),
                        "pronouns": random.choice(
                            ["she/her", "he/him", "they/them", ""]
                        ),
                        **demographic_defaults,
                        "email": (
                            f"{first_name.lower()}.{last_name.lower()}{patient_index}"
                            "@demo-patient.local"
                        ),
                        "ssn": demo_ssn,
                        "ssn_last4": demo_ssn[-4:],
                        "pcp": random.choice(
                            list(
                                CareProvider.objects.filter(
                                    facility=facility,
                                    is_active=True,
                                )
                            )
                        ),
                        "referring_provider": external_referrer,
                        "preferred_pharmacy": pharmacy,
                        "is_active": True,
                    },
                )

                # Normalize existing patient fields too
                patient.gender = patient.gender or random.choice(genders)
                patient.is_active = True
                patient.middle_name = patient.middle_name or random.choice(
                    ["A", "J", "M", ""]
                )
                patient.preferred_name = patient.preferred_name or patient.first_name
                patient.sex_at_birth = patient.sex_at_birth or random.choice(
                    ["female", "male", "unknown", "undisclosed"]
                )
                if not patient.race and not patient.race_declined:
                    patient.race = demographic_defaults["race"]
                    patient.race_declined = demographic_defaults["race_declined"]
                if not patient.ethnicity and not patient.ethnicity_declined:
                    patient.ethnicity = demographic_defaults["ethnicity"]
                    patient.ethnicity_declined = demographic_defaults[
                        "ethnicity_declined"
                    ]
                patient.preferred_language = (
                    patient.preferred_language
                    or random.choice(["English", "Spanish", "Mandarin", "Bengali"])
                )
                if not patient.email:
                    patient.email = (
                        f"{patient.first_name.lower()}.{patient.last_name.lower()}"
                        f"{patient_index}@demo-patient.local"
                    )
                normalize_demo_patient_ssn(patient)
                if not patient.pcp:
                    patient.pcp = external_pcp
                if not patient.referring_provider:
                    patient.referring_provider = external_referrer
                if not patient.preferred_pharmacy:
                    patient.preferred_pharmacy = pharmacy
                if not patient.address_id:
                    patient.address = Address.objects.create(
                        line_1=f"{100 + patient_index} Demo Street",
                        city=facility.address.city if facility.address else "New York",
                        state=facility.address.state if facility.address else "NY",
                        zip_code=(
                            facility.address.zip_code if facility.address else "10001"
                        ),
                    )
                patient.save()
                sync_patient_phone(patient, facility, patient_index)
                sync_emergency_contact(patient, patient_index)

                PatientInsurancePolicy.objects.get_or_create(
                    patient=patient,
                    carrier=random.choice(carriers),
                    member_id=f"{facility.facility_code or facility.id}-{patient_index:06d}",
                    defaults={
                        "plan_name": random.choice(
                            ["Gold PPO", "Silver HMO", "Community Plan"]
                        ),
                        "group_number": f"GRP-{facility.facility_code or facility.id}-{patient_index:04d}",
                        "subscriber_name": f"{patient.first_name} {patient.last_name}",
                        "relationship_to_subscriber": "self",
                        "effective_date": today - timedelta(days=365),
                        "is_primary": True,
                        "is_active": True,
                        "notes": "Seeded primary insurance policy.",
                    },
                )

                patients.append(patient)

            for seeded_patient in Patient.objects.filter(
                facility=facility,
                email__endswith="@demo-patient.local",
            ):
                previous_ssn = seeded_patient.ssn
                previous_last4 = seeded_patient.ssn_last4
                normalize_demo_patient_ssn(seeded_patient)
                if (
                    seeded_patient.ssn != previous_ssn
                    or seeded_patient.ssn_last4 != previous_last4
                ):
                    Patient.objects.filter(pk=seeded_patient.pk).update(
                        ssn=seeded_patient.ssn,
                        ssn_last4=seeded_patient.ssn_last4,
                    )

            demo_patient_qs = Patient.objects.filter(
                facility=facility,
                email__endswith="@demo-patient.local",
            )
            Encounter.objects.filter(
                facility=facility, patient__in=demo_patient_qs
            ).delete()
            # ``Medication`` is the protected target of ``RefillRequest``;
            # clear seeded refills first so the medication reset below can
            # cascade cleanly on every re-run.
            RefillRequest.objects.filter(
                facility=facility, patient__in=demo_patient_qs
            ).delete()
            Medication.objects.filter(
                facility=facility, patient__in=demo_patient_qs
            ).delete()
            PatientAllergy.objects.filter(
                facility=facility,
                patient__in=demo_patient_qs,
            ).delete()

            provider_name = (
                provider_staff[0].user.get_full_name()
                if provider_staff and provider_staff[0].user.get_full_name()
                else "CareFlow Demo Provider"
            )
            for patient_index, patient in enumerate(patients, start=1):
                seed_medications_for_patient(patient, patient_index, provider_name)
                seed_allergies_for_patient(patient, patient_index)

            document_storage = get_patient_document_storage()
            for patient in patients[: min(6, len(patients))]:
                for document in SAMPLE_DOCUMENTS:
                    patient_document = PatientDocument.objects.filter(
                        patient=patient,
                        name=document["name"],
                    ).first()
                    needs_local_pdf = (
                        not patient_document
                        or not patient_document.storage_key
                        or patient_document.file_url
                        == "https://example.com/sample-document.pdf"
                    )

                    if not needs_local_pdf:
                        continue

                    storage_key, document_defaults = save_sample_pdf(
                        document_storage,
                        patient,
                        document,
                        today=today,
                    )
                    if not patient_document:
                        PatientDocument.objects.create(
                            patient=patient,
                            name=document["name"],
                            **document_defaults,
                            storage_key=storage_key,
                            file_url="",
                        )
                    else:
                        for field, value in document_defaults.items():
                            setattr(patient_document, field, value)
                        patient_document.storage_key = storage_key
                        patient_document.file_url = ""
                        patient_document.save()

            tz = timezone.get_current_timezone()
            base_daily_count = appointments_per_day[facility.id]
            created_appointments = []

            for day_offset in range(-21, 7):
                visit_date = today + timedelta(days=day_offset)
                if visit_date.isoweekday() not in (facility.operating_days or []):
                    continue

                variation = random.choice(
                    [0.3, 0.45, 0.55, 0.65, 0.75, 0.85, 1.0, 1.0, 1.0]
                )
                daily_count = max(1, int(base_daily_count * variation))

                start_minute = (
                    facility.operating_start_time.hour * 60
                    + facility.operating_start_time.minute
                )
                end_minute = (
                    facility.operating_end_time.hour * 60
                    + facility.operating_end_time.minute
                )
                slots = [
                    (minute // 60, minute % 60)
                    for minute in range(start_minute, end_minute, 15)
                ]
                random.shuffle(slots)

                for hour, minute in slots[:daily_count]:
                    patient = random.choice(patients)
                    appt_type = random.choice(types)
                    status = random.choice(statuses)
                    rendering_provider = (
                        random.choice(provider_staff) if provider_staff else None
                    )
                    resource = (
                        FacilityResource.objects.filter(
                            linked_staff=rendering_provider
                        ).first()
                        if rendering_provider
                        else None
                    )

                    naive_dt = datetime.combine(
                        visit_date,
                        time(hour=hour, minute=minute),
                    )
                    aware_dt = timezone.make_aware(naive_dt, tz)

                    appointment = Appointment.objects.create(
                        facility=facility,
                        patient=patient,
                        resource=resource,
                        rendering_provider=rendering_provider,
                        appointment_time=aware_dt,
                        room=resource.default_room if resource else "",
                        reason=random.choice(reasons),
                        notes=random.choice(
                            [
                                "",
                                "Bring insurance card and medication list.",
                                "Arrive 15 minutes early for intake.",
                                "Patient prefers morning appointments.",
                                "Follow up on recent labs during visit.",
                            ]
                        ),
                        status=status,
                        appointment_type=appt_type,
                        created_by=admin_user,
                    )
                    created_appointments.append(appointment)

            seed_clinical_flow_for_facility(facility, created_appointments)

            self.stdout.write(
                f"  - Seeded {facility.name}: {len(patients)} patients, appointments, clinical records, meds, allergies, and billing workflow data"
            )

        # -----------------------------
        # Patient portal demo account
        # -----------------------------
        # Prefer an already-bound portal account so a re-run keeps the same
        # demo patient (and the same showcase data sitting on them). Fall
        # back to the seed patient with the richest clinical data on first
        # run so the portal demo lands on populated lists.
        existing_portal_account = (
            PatientPortalAccount.objects.filter(user__username="patient_demo")
            .select_related("patient")
            .first()
        )
        if existing_portal_account and existing_portal_account.patient_id:
            portal_patient = Patient.objects.filter(
                pk=existing_portal_account.patient_id
            ).first()
        else:
            portal_patient = None

        if portal_patient is None:
            portal_patient = (
                Patient.objects.filter(email__endswith="@demo-patient.local")
                .annotate(
                    appt_count=Count("appointments", distinct=True),
                    med_count=Count("medications", distinct=True),
                    allergy_count=Count("allergies", distinct=True),
                )
                .order_by(
                    "-appt_count",
                    "-med_count",
                    "-allergy_count",
                    "last_name",
                    "first_name",
                    "id",
                )
                .first()
            )
        if portal_patient is not None:
            portal_user, portal_created = User.objects.get_or_create(
                username="patient_demo",
                defaults={
                    "email": "patient.demo@careflow.xinyiklin.com",
                    "first_name": portal_patient.first_name,
                    "last_name": portal_patient.last_name,
                    "is_active": True,
                },
            )
            portal_user.email = "patient.demo@careflow.xinyiklin.com"
            portal_user.first_name = portal_patient.first_name
            portal_user.last_name = portal_patient.last_name
            portal_user.is_active = True
            portal_user.set_password("Patient123!")
            portal_user.save()

            if not PatientPortalAccount.objects.filter(user=portal_user).exists():
                PatientPortalAccount.objects.create(
                    user=portal_user,
                    patient=portal_patient,
                    is_active=True,
                )

            self.stdout.write(
                f"  - {'Created' if portal_created else 'Updated'} portal user: "
                f"patient_demo → {portal_patient}"
            )
        else:
            self.stdout.write(
                "  - Skipped portal demo account (no demo patients found)"
            )

        # -----------------------------
        # Online scheduling demo data
        # -----------------------------
        # Enable portal scheduling on the demo patient's facility and create
        # a handful of forward-looking bookable slots so the patient app
        # demos with non-empty state.
        if portal_patient is not None:
            from appointments.models import BookableSlot

            demo_facility = portal_patient.facility
            demo_facility.online_cancellation_enabled = True
            demo_facility.cancellation_cutoff_hours = 24
            demo_facility.online_scheduling_disabled = False
            demo_facility.save()

            # Enable bookable_online on common types (and auto_confirm on a
            # couple so the demo shows both code paths).
            bookable_codes = ["follow_up", "tele_visit", "new_patient"]
            auto_confirm_codes = ["follow_up", "tele_visit"]
            for code in bookable_codes:
                appt_type = AppointmentType.objects.filter(
                    facility=demo_facility, code=code
                ).first()
                if appt_type:
                    appt_type.bookable_online = True
                    appt_type.auto_confirm_bookings = code in auto_confirm_codes
                    appt_type.save()

            # Opt the facility's active providers into portal scheduling.
            demo_providers = Staff.objects.filter(
                facility=demo_facility,
                is_active=True,
                role__code="physician",
            )
            for provider in demo_providers:
                provider.online_scheduling_enabled = True
                provider.auto_confirm_bookings = True
                provider.online_cancellation_enabled = True
                provider.cancellation_cutoff_hours = 24
                provider.save()

            # Create future bookable slots for the demo providers across the
            # next 14 days at 9:00, 10:30, 14:00 local time. Idempotent: skip
            # slots that already exist for (provider, start_time).
            bookable_types_for_slots = list(
                AppointmentType.objects.filter(
                    facility=demo_facility, bookable_online=True
                )
            )
            slot_hours = [(9, 0), (10, 30), (14, 0)]
            now = timezone.now()
            slots_created = 0
            for provider in demo_providers:
                if not bookable_types_for_slots:
                    break
                for day_offset in range(1, 15):
                    base = (now + timedelta(days=day_offset)).replace(
                        microsecond=0, second=0
                    )
                    for slot_index, (hour, minute) in enumerate(slot_hours):
                        start = base.replace(hour=hour, minute=minute)
                        if start <= now:
                            continue
                        appt_type = bookable_types_for_slots[
                            (day_offset + slot_index) % len(bookable_types_for_slots)
                        ]
                        end = start + timedelta(
                            minutes=appt_type.duration_minutes or 30
                        )
                        if not BookableSlot.objects.filter(
                            provider=provider, start_time=start
                        ).exists():
                            BookableSlot.objects.create(
                                provider=provider,
                                appointment_type=appt_type,
                                start_time=start,
                                end_time=end,
                                created_by=admin_user,
                            )
                            slots_created += 1
            self.stdout.write(
                f"  - Created {slots_created} bookable slots for online scheduling"
            )

        # -----------------------------
        # Refill request + message thread for the portal demo patient
        # -----------------------------
        # Seed one pending refill, one approved refill, one denied refill,
        # plus three message threads (one patient-only open, one with a
        # clinician reply still unread, one closed) so the clinician inbox +
        # refill queue and the patient portal show non-empty, varied state
        # for the demo. Every helper is idempotent on re-run.
        def seed_refill_requests(patient):
            if RefillRequest.objects.filter(
                patient=patient,
                status=RefillRequest.STATUS_PENDING,
            ).exists():
                return False

            active_medication = (
                Medication.objects.filter(
                    patient=patient,
                    status=Medication.STATUS_ACTIVE,
                )
                .order_by("id")
                .first()
            )
            if not active_medication:
                return False

            pharmacy = patient.preferred_pharmacy
            if not pharmacy:
                allowed_ids = get_effective_pharmacy_ids(patient.facility)
                pharmacy = (
                    Pharmacy.objects.filter(id__in=allowed_ids, is_active=True)
                    .order_by("id")
                    .first()
                )

            RefillRequest.objects.create(
                medication=active_medication,
                patient=patient,
                facility=patient.facility,
                pharmacy=pharmacy,
                pharmacy_name=(pharmacy.name if pharmacy else ""),
                status=RefillRequest.STATUS_PENDING,
                patient_note=(
                    "I'm running low on this medication and would like a refill "
                    "before my next visit."
                ),
            )
            return True

        def seed_resolved_refill_requests(patient):
            """Seed one approved and one denied refill so history pages render."""
            created_any = False
            active_medications = list(
                Medication.objects.filter(
                    patient=patient,
                    status=Medication.STATUS_ACTIVE,
                ).order_by("id")
            )
            if not active_medications:
                return False

            pharmacy = patient.preferred_pharmacy
            if not pharmacy:
                allowed_ids = get_effective_pharmacy_ids(patient.facility)
                pharmacy = (
                    Pharmacy.objects.filter(id__in=allowed_ids, is_active=True)
                    .order_by("id")
                    .first()
                )

            approved_medication = active_medications[0]
            if not RefillRequest.objects.filter(
                patient=patient,
                status=RefillRequest.STATUS_APPROVED,
            ).exists():
                approved = RefillRequest.objects.create(
                    medication=approved_medication,
                    patient=patient,
                    facility=patient.facility,
                    pharmacy=pharmacy,
                    pharmacy_name=(pharmacy.name if pharmacy else ""),
                    status=RefillRequest.STATUS_APPROVED,
                    patient_note=(
                        "Hi — could I get a refill on this prescription? " "Thanks!"
                    ),
                    clinician_note=("Approved — pickup ready at preferred pharmacy."),
                    resolved_at=timezone.now() - timedelta(days=14),
                    resolved_by=admin_user,
                )
                # Backdate requested_at so the resolved record reads as
                # historical alongside the recent pending one.
                RefillRequest.objects.filter(pk=approved.pk).update(
                    requested_at=timezone.now() - timedelta(days=16),
                    resolved_at=timezone.now() - timedelta(days=14),
                )
                created_any = True

            # Use a different medication for the denied refill when possible.
            denied_medication = (
                active_medications[1]
                if len(active_medications) > 1
                else active_medications[0]
            )
            if not RefillRequest.objects.filter(
                patient=patient,
                status=RefillRequest.STATUS_DENIED,
            ).exists():
                denied = RefillRequest.objects.create(
                    medication=denied_medication,
                    patient=patient,
                    facility=patient.facility,
                    pharmacy=pharmacy,
                    pharmacy_name=(pharmacy.name if pharmacy else ""),
                    status=RefillRequest.STATUS_DENIED,
                    patient_note=("Refill request for my evening medication."),
                    clinician_note=(
                        "Please schedule a follow-up visit before refilling."
                    ),
                    resolved_at=timezone.now() - timedelta(days=10),
                    resolved_by=admin_user,
                )
                RefillRequest.objects.filter(pk=denied.pk).update(
                    requested_at=timezone.now() - timedelta(days=12),
                    resolved_at=timezone.now() - timedelta(days=10),
                )
                created_any = True

            return created_any

        def seed_message_threads(patient):
            subject = "Question about my medication"
            if MessageThread.objects.filter(
                patient=patient,
                subject=subject,
            ).exists():
                return False

            thread = MessageThread.objects.create(
                facility=patient.facility,
                patient=patient,
                subject=subject,
                status=MessageThread.STATUS_OPEN,
            )
            Message.objects.create(
                thread=thread,
                sender_kind=Message.SENDER_PATIENT,
                sender_display_name=f"{patient.first_name} {patient.last_name}",
                body=(
                    "Hi — I've been having mild dizziness in the mornings since "
                    "starting my new medication. Should I be concerned, or is "
                    "this expected for the first couple of weeks?"
                ),
            )
            return True

        def seed_reply_message_thread(patient):
            """Seed an open thread with a clinician reply still unread."""
            subject = "Lab results from last visit"
            if MessageThread.objects.filter(
                patient=patient,
                subject=subject,
            ).exists():
                return False

            thread = MessageThread.objects.create(
                facility=patient.facility,
                patient=patient,
                subject=subject,
                status=MessageThread.STATUS_OPEN,
            )
            Message.objects.create(
                thread=thread,
                sender_kind=Message.SENDER_PATIENT,
                sender_display_name=f"{patient.first_name} {patient.last_name}",
                body=(
                    "I just saw my lab results posted on the portal. The "
                    "cholesterol number looked higher than last time — "
                    "should I be worried, or is it still in a safe range?"
                ),
            )
            Message.objects.create(
                thread=thread,
                sender_kind=Message.SENDER_CLINICIAN,
                sender_user=admin_user,
                sender_display_name=f"Care Team at {patient.facility.name}",
                body=(
                    "Thanks for reaching out. Your latest cholesterol is "
                    "slightly above target but still well within a safe "
                    "range. We'll review trends together at your next visit. "
                    "In the meantime, keep up with the diet and exercise "
                    "changes we discussed."
                ),
            )

            # Post-save: clinician reply leaves unread_for_patient=True
            # (so the portal shows a fresh-reply badge on demo login) and
            # unread_for_clinician=False (the clinician has read the patient
            # message they responded to).
            MessageThread.objects.filter(pk=thread.pk).update(
                unread_for_clinician=False,
                unread_for_patient=True,
            )
            return True

        def seed_closed_message_thread(patient):
            """Seed a closed thread with patient + clinician + close message."""
            subject = "Pharmacy hours question"
            if MessageThread.objects.filter(
                patient=patient,
                subject=subject,
            ).exists():
                return False

            thread = MessageThread.objects.create(
                facility=patient.facility,
                patient=patient,
                subject=subject,
                status=MessageThread.STATUS_OPEN,
            )
            Message.objects.create(
                thread=thread,
                sender_kind=Message.SENDER_PATIENT,
                sender_display_name=f"{patient.first_name} {patient.last_name}",
                body=(
                    "Quick question — what are the pharmacy hours on "
                    "weekends? I'd like to pick up my refill this Saturday."
                ),
            )
            Message.objects.create(
                thread=thread,
                sender_kind=Message.SENDER_CLINICIAN,
                sender_user=admin_user,
                sender_display_name=f"Care Team at {patient.facility.name}",
                body=(
                    "Our on-site pharmacy is open Saturdays 9 AM – 1 PM. "
                    "Your refill will be ready any time after 10 AM on "
                    "Saturday. Have a great weekend!"
                ),
            )
            Message.objects.create(
                thread=thread,
                sender_kind=Message.SENDER_CLINICIAN,
                sender_user=admin_user,
                sender_display_name=f"Care Team at {patient.facility.name}",
                body="Closing this thread — feel free to reach out anytime.",
            )

            MessageThread.objects.filter(pk=thread.pk).update(
                status=MessageThread.STATUS_CLOSED,
                unread_for_clinician=False,
                unread_for_patient=False,
            )
            return True

        def seed_portal_patient_vitals(patient):
            """Ensure the most recent signed encounters carry a vitals row.

            ``seed_clinical_flow_for_facility`` already creates vitals for ~4
            of every 5 encounters via a stable index pattern. Explicitly
            backfill the portal patient's three most recent signed encounters
            so the medical-summary demo always shows a vitals trend.
            """
            recent_signed = list(
                Encounter.objects.filter(
                    patient=patient,
                    status=Encounter.STATUS_SIGNED,
                ).order_by("-started_at")[:3]
            )
            if not recent_signed:
                return 0

            # Slightly varying values so the chart/trend renders meaningful.
            vitals_seed = [
                {
                    "bp_systolic": 118,
                    "bp_diastolic": 76,
                    "heart_rate_bpm": 68,
                    "respiratory_rate": 14,
                    "temperature_c": Decimal("36.7"),
                    "spo2_percent": 99,
                    "pain_score": 0,
                    "height_cm": Decimal("170"),
                    "weight_kg": Decimal("72.0"),
                },
                {
                    "bp_systolic": 124,
                    "bp_diastolic": 80,
                    "heart_rate_bpm": 74,
                    "respiratory_rate": 16,
                    "temperature_c": Decimal("36.9"),
                    "spo2_percent": 98,
                    "pain_score": 1,
                    "height_cm": Decimal("170"),
                    "weight_kg": Decimal("72.4"),
                },
                {
                    "bp_systolic": 130,
                    "bp_diastolic": 84,
                    "heart_rate_bpm": 82,
                    "respiratory_rate": 18,
                    "temperature_c": Decimal("37.1"),
                    "spo2_percent": 97,
                    "pain_score": 2,
                    "height_cm": Decimal("170"),
                    "weight_kg": Decimal("72.8"),
                },
            ]

            created = 0
            for encounter, values in zip(recent_signed, vitals_seed):
                if Vitals.objects.filter(encounter=encounter).exists():
                    continue
                Vitals.objects.create(
                    encounter=encounter,
                    measured_at=encounter.started_at,
                    recorded_by=admin_user,
                    notes="Seeded for demo medical-summary trend.",
                    **values,
                )
                created += 1
            return created

        def ensure_portal_patient_preferred_pharmacy(patient):
            """Ensure the portal patient has a default PatientPharmacy row.

            The portal endpoint sets the preferred pharmacy via the
            ``PatientPharmacy`` join table (whose ``save`` cascades the id
            onto ``Patient.preferred_pharmacy``), so we mirror that here
            instead of writing the FK directly.
            """
            allowed_ids = get_effective_pharmacy_ids(patient.facility)
            if not allowed_ids:
                return False

            # Prefer the facility's own seeded pharmacy when present.
            facility_pharmacy = Pharmacy.objects.filter(
                id__in=allowed_ids,
                is_active=True,
                name=f"{patient.facility.name} Pharmacy",
            ).first()
            pharmacy = (
                facility_pharmacy
                or Pharmacy.objects.filter(id__in=allowed_ids, is_active=True)
                .order_by("id")
                .first()
            )
            if not pharmacy:
                return False

            existing = PatientPharmacy.objects.filter(
                patient=patient,
                pharmacy=pharmacy,
            ).first()
            if existing:
                if existing.is_default and existing.is_active:
                    return False
                existing.is_default = True
                existing.is_active = True
                existing.save()
                return True

            PatientPharmacy.objects.create(
                patient=patient,
                pharmacy=pharmacy,
                is_default=True,
                is_active=True,
                notes="Seeded default pharmacy for portal demo.",
            )
            return True

        def seed_portal_patient_clinical_topup(patient):
            """Guarantee the portal patient has rich medication + allergy data.

            Tops up to at least 5 active medications, 2 inactive medications,
            and 4 allergies so the demo medical-summary page never reads as
            anemic. Idempotent: existing rows are kept and matched by
            case-insensitive name/allergen so reruns do not duplicate.
            """
            active_target = 5
            inactive_target = 2
            allergy_target = 4

            portal_active_meds = [
                {
                    "medication_name": "Lisinopril",
                    "dose": "10 mg",
                    "route": "Oral",
                    "frequency": "Once daily",
                    "notes": "Blood pressure management.",
                },
                {
                    "medication_name": "Metformin",
                    "dose": "500 mg",
                    "route": "Oral",
                    "frequency": "Twice daily with meals",
                    "notes": "Type 2 diabetes management.",
                },
                {
                    "medication_name": "Atorvastatin",
                    "dose": "20 mg",
                    "route": "Oral",
                    "frequency": "Once daily at bedtime",
                    "notes": "Cholesterol management.",
                },
                {
                    "medication_name": "Levothyroxine",
                    "dose": "75 mcg",
                    "route": "Oral",
                    "frequency": "Once daily on empty stomach",
                    "notes": "Hypothyroidism — take 30 minutes before breakfast.",
                },
                {
                    "medication_name": "Omeprazole",
                    "dose": "20 mg",
                    "route": "Oral",
                    "frequency": "Once daily before meals",
                    "notes": "Acid reflux management.",
                },
                {
                    "medication_name": "Albuterol HFA",
                    "dose": "90 mcg/actuation",
                    "route": "Inhalation",
                    "frequency": "Two puffs every 4-6 hours as needed",
                    "notes": "Rescue inhaler for intermittent wheezing.",
                },
                {
                    "medication_name": "Sertraline",
                    "dose": "50 mg",
                    "route": "Oral",
                    "frequency": "Once daily",
                    "notes": "Anxiety and depression management.",
                },
            ]

            portal_inactive_meds = [
                {
                    "medication_name": "Ibuprofen",
                    "dose": "200 mg",
                    "route": "Oral",
                    "frequency": "As needed for pain",
                    "notes": "Discontinued — completed course.",
                },
                {
                    "medication_name": "Amoxicillin",
                    "dose": "500 mg",
                    "route": "Oral",
                    "frequency": "Three times daily",
                    "notes": "Discontinued — completed antibiotic course.",
                },
            ]

            portal_allergies = [
                {
                    "allergen": "Penicillin",
                    "category": PatientAllergy.CATEGORY_MEDICATION,
                    "reaction": "Hives, swelling",
                    "severity": PatientAllergy.SEVERITY_SEVERE,
                    "notes": "Avoid beta-lactam antibiotics unless reviewed.",
                },
                {
                    "allergen": "Sulfa drugs",
                    "category": PatientAllergy.CATEGORY_MEDICATION,
                    "reaction": "Rash",
                    "severity": PatientAllergy.SEVERITY_MODERATE,
                    "notes": "Avoid sulfonamide antibiotics.",
                },
                {
                    "allergen": "Latex",
                    "category": PatientAllergy.CATEGORY_LATEX,
                    "reaction": "Skin irritation",
                    "severity": PatientAllergy.SEVERITY_MILD,
                    "notes": "Use non-latex supplies.",
                },
                {
                    "allergen": "Peanuts",
                    "category": PatientAllergy.CATEGORY_FOOD,
                    "reaction": "Anaphylaxis",
                    "severity": PatientAllergy.SEVERITY_SEVERE,
                    "notes": "Patient carries epinephrine auto-injector.",
                },
                {
                    "allergen": "Shellfish",
                    "category": PatientAllergy.CATEGORY_FOOD,
                    "reaction": "GI upset, hives",
                    "severity": PatientAllergy.SEVERITY_MODERATE,
                    "notes": "Patient carries OTC antihistamine.",
                },
            ]

            existing_active = Medication.objects.filter(
                patient=patient,
                status=Medication.STATUS_ACTIVE,
            ).count()
            existing_inactive = (
                Medication.objects.filter(patient=patient)
                .exclude(status=Medication.STATUS_ACTIVE)
                .count()
            )
            existing_allergies = PatientAllergy.objects.filter(
                patient=patient,
            ).count()

            prescriber_name = "Demo User"
            active_meds_added = 0
            inactive_meds_added = 0
            allergies_added = 0

            for index, template in enumerate(portal_active_meds):
                if existing_active + active_meds_added >= active_target:
                    break
                if Medication.objects.filter(
                    patient=patient,
                    medication_name__iexact=template["medication_name"],
                ).exists():
                    continue
                Medication.objects.create(
                    patient=patient,
                    facility=patient.facility,
                    status=Medication.STATUS_ACTIVE,
                    start_date=today - timedelta(days=120 + index * 25),
                    prescriber_name=prescriber_name,
                    created_by=admin_user,
                    updated_by=admin_user,
                    **template,
                )
                active_meds_added += 1

            for index, template in enumerate(portal_inactive_meds):
                if existing_inactive + inactive_meds_added >= inactive_target:
                    break
                if Medication.objects.filter(
                    patient=patient,
                    medication_name__iexact=template["medication_name"],
                ).exists():
                    continue
                Medication.objects.create(
                    patient=patient,
                    facility=patient.facility,
                    status=Medication.STATUS_DISCONTINUED,
                    start_date=today - timedelta(days=240 + index * 30),
                    end_date=today - timedelta(days=45 + index * 15),
                    prescriber_name=prescriber_name,
                    created_by=admin_user,
                    updated_by=admin_user,
                    **template,
                )
                inactive_meds_added += 1

            for index, template in enumerate(portal_allergies):
                if existing_allergies + allergies_added >= allergy_target:
                    break
                if PatientAllergy.objects.filter(
                    patient=patient,
                    allergen__iexact=template["allergen"],
                ).exists():
                    continue
                PatientAllergy.objects.create(
                    patient=patient,
                    facility=patient.facility,
                    onset_date=today - timedelta(days=400 + index * 60),
                    status=PatientAllergy.STATUS_ACTIVE,
                    created_by=admin_user,
                    updated_by=admin_user,
                    **template,
                )
                allergies_added += 1

            return (active_meds_added, inactive_meds_added, allergies_added)

        if portal_patient is not None:
            refill_created = seed_refill_requests(portal_patient)
            resolved_refills_created = seed_resolved_refill_requests(portal_patient)
            thread_created = seed_message_threads(portal_patient)
            reply_thread_created = seed_reply_message_thread(portal_patient)
            closed_thread_created = seed_closed_message_thread(portal_patient)
            vitals_created = seed_portal_patient_vitals(portal_patient)
            pharmacy_updated = ensure_portal_patient_preferred_pharmacy(portal_patient)
            (
                clinical_active_added,
                clinical_inactive_added,
                clinical_allergies_added,
            ) = seed_portal_patient_clinical_topup(portal_patient)
            # Refresh so summary queries reflect the PatientPharmacy cascade.
            portal_patient.refresh_from_db()

            self.stdout.write(
                f"  - Portal demo refill {'created' if refill_created else 'skipped'}; "
                f"resolved refills {'created' if resolved_refills_created else 'skipped'}; "
                f"open thread {'created' if thread_created else 'skipped'}; "
                f"reply thread {'created' if reply_thread_created else 'skipped'}; "
                f"closed thread {'created' if closed_thread_created else 'skipped'}; "
                f"vitals backfilled: {vitals_created}; "
                f"preferred pharmacy {'set' if pharmacy_updated else 'unchanged'}; "
                f"clinical top-up — active meds: +{clinical_active_added}, "
                f"inactive meds: +{clinical_inactive_added}, "
                f"allergies: +{clinical_allergies_added}"
            )

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully!"))

        # -----------------------------
        # Demo accounts showcase summary
        # -----------------------------
        if portal_patient is not None:
            now = timezone.now()
            upcoming_appts = Appointment.objects.filter(
                patient=portal_patient,
                appointment_time__gte=now,
            ).count()
            past_appts = Appointment.objects.filter(
                patient=portal_patient,
                appointment_time__lt=now,
            ).count()
            active_meds = Medication.objects.filter(
                patient=portal_patient,
                status=Medication.STATUS_ACTIVE,
            ).count()
            inactive_meds = (
                Medication.objects.filter(
                    patient=portal_patient,
                )
                .exclude(status=Medication.STATUS_ACTIVE)
                .count()
            )
            allergy_count = PatientAllergy.objects.filter(
                patient=portal_patient,
            ).count()
            vitals_count = Vitals.objects.filter(
                encounter__patient=portal_patient,
            ).count()

            threads_qs = MessageThread.objects.filter(patient=portal_patient)
            thread_total = threads_qs.count()
            thread_open = threads_qs.filter(status=MessageThread.STATUS_OPEN).count()
            thread_closed = threads_qs.filter(
                status=MessageThread.STATUS_CLOSED
            ).count()
            thread_unread_patient = threads_qs.filter(unread_for_patient=True).count()

            refills_qs = RefillRequest.objects.filter(patient=portal_patient)
            refill_total = refills_qs.count()
            refill_pending = refills_qs.filter(
                status=RefillRequest.STATUS_PENDING
            ).count()
            refill_approved = refills_qs.filter(
                status=RefillRequest.STATUS_APPROVED
            ).count()
            refill_denied = refills_qs.filter(
                status=RefillRequest.STATUS_DENIED
            ).count()

            pharmacy_name = (
                portal_patient.preferred_pharmacy.name
                if portal_patient.preferred_pharmacy
                else "none"
            )
            patient_display = f"{portal_patient.first_name} {portal_patient.last_name}"
            facility_name = portal_patient.facility.name
            demo_username = getattr(settings, "DEMO_USERNAME", "demo")

            divider = "=" * 44
            lines = [
                divider,
                "Demo accounts ready",
                divider,
                "",
                "Clinician (https://app or local clinician URL):",
                f"  username: {demo_username}",
                "  password: Admin123!",
                "  display:  Demo User (Owner)",
                f"  facility: {facility_name}",
                "",
                "Patient portal (https://portal or local portal URL):",
                "  username: patient_demo",
                "  password: Patient123!",
                f"  display:  {patient_display}",
                f"  facility: {facility_name}",
                "",
                "Patient data on patient_demo:",
                f"  Appointments:    {upcoming_appts} upcoming, {past_appts} past",
                f"  Medications:     {active_meds} active, {inactive_meds} inactive",
                f"  Allergies:       {allergy_count}",
                f"  Vitals records:  {vitals_count}",
                (
                    f"  Message threads: {thread_total} total "
                    f"({thread_open} open, {thread_closed} closed; "
                    f"{thread_unread_patient} unread_for_patient)"
                ),
                (
                    f"  Refill requests: {refill_total} total "
                    f"({refill_pending} pending, {refill_approved} approved, "
                    f"{refill_denied} denied)"
                ),
                f"  Preferred pharmacy: {pharmacy_name}",
                divider,
            ]
            for line in lines:
                self.stdout.write(line)
        else:
            self.stdout.write("Demo user login:")
            self.stdout.write(
                f"  username: {getattr(settings, 'DEMO_USERNAME', 'demo')}"
            )
            self.stdout.write("  password: Admin123!")
            self.stdout.write("Patient portal login:")
            self.stdout.write("  username: patient_demo")
            self.stdout.write("  password: Patient123!")
