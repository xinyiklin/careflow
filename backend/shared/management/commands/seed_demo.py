import random
from datetime import datetime, time, timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from appointments.models import Appointment
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
from insurance.models import InsuranceCarrier, PatientInsurancePolicy
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
                "email": "ops@careflow-demo.com",
                "website": "https://careflow-demo.local",
                "tax_id": "12-3456789",
                "notes": "Demo organization used for local development and QA workflows.",
            },
        )
        org.name = "CareFlow Demo Organization"
        org.legal_name = "CareFlow Demo Medical Group, PLLC"
        org.phone_number = "(212) 555-0100"
        org.email = "ops@careflow-demo.com"
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
            is_demo_admin = username == getattr(settings, "DEMO_USERNAME", "admin")

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
            getattr(settings, "DEMO_USERNAME", "admin"),
            "admin@demo.com",
            "Maya",
            "Bennett",
        )
        doctor_user = create_user("demo_doctor", "doctor@demo.com", "Elliot", "Reed")
        doctor2_user = create_user(
            "demo_doctor2", "doctor2@demo.com", "Nadia", "Solano"
        )
        nurse_user = create_user("demo_nurse", "nurse@demo.com", "Theo", "Park")
        staff_user = create_user("demo_staff", "staff@demo.com", "Iris", "Cole")
        staff2_user = create_user("demo_staff2", "staff2@demo.com", "Jonah", "Vale")
        facility_admin_user = create_user(
            "demo_facility_admin",
            "facilityadmin@demo.com",
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
                "email": "clinic-a@careflow-demo.com",
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
                "email": "clinic-b@careflow-demo.com",
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
                "email": "clinic-c@careflow-demo.com",
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
            },
            {
                "name": "Empire Health",
                "payer_id": "EMP002",
                "phone_number": "(800) 555-4200",
                "website": "https://empire-demo.local",
            },
            {
                "name": "United Community Plan",
                "payer_id": "UCP003",
                "phone_number": "(800) 555-4300",
                "website": "https://community-demo.local",
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
            carrier.is_active = True
            carrier.save()
            carriers.append(carrier)

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

            patients = []
            used_patient_keys = set()

            target_patient_count = patient_counts[facility.id]

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
                demo_ssn = f"{random.randint(100000000, 999999999):09d}"
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
                if not patient.ssn:
                    preserved_last4 = (
                        patient.ssn_last4 or f"{random.randint(0, 9999):04d}"
                    )
                    patient.ssn = f"{random.randint(10000, 99999):05d}{preserved_last4}"
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
            daily_count = appointments_per_day[facility.id]

            for day_offset in range(-3, 7):
                visit_date = today + timedelta(days=day_offset)
                if visit_date.isoweekday() not in (facility.operating_days or []):
                    continue

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

                    Appointment.objects.create(
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

            self.stdout.write(
                f"  - Seeded {facility.name}: {len(patients)} patients and appointments across 10 days"
            )

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully!"))
        self.stdout.write("Demo admin login:")
        self.stdout.write(f"  username: {getattr(settings, 'DEMO_USERNAME', 'admin')}")
        self.stdout.write("  password: Admin123!")
