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
from medications.models import Medication
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
    PatientPhone,
    Pharmacy,
    ensure_default_document_categories,
)
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
        # Pick the seed patient with the richest clinical data so the portal
        # demo lands on populated lists rather than empty states.
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

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully!"))
        self.stdout.write("Demo user login:")
        self.stdout.write(f"  username: {getattr(settings, 'DEMO_USERNAME', 'demo')}")
        self.stdout.write("  password: Admin123!")
        self.stdout.write("Patient portal login:")
        self.stdout.write("  username: patient_demo")
        self.stdout.write("  password: Patient123!")
