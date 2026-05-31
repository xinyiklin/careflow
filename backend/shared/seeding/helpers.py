"""Cross-cutting seed helpers (users, role/title/staff lookups, patient demo
field generation). Pure except ``create_user`` which writes to ``ctx.stdout``.

RNG note: helpers that call ``random`` use the global module RNG (seeded once
in ``run_seed``); call order is preserved from the original command.
"""

import random

from django.conf import settings
from django.contrib.auth import get_user_model

from facilities.models import Staff, StaffRole, StaffTitle
from insurance.models import PatientInsurancePolicy
from patients.models import PatientEmergencyContact, PatientPhone


def create_user(ctx, username, email, first_name, last_name, password="Admin123!"):
    User = get_user_model()
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
    ctx.stdout.write(f"  - {status_msg} user: {username} (Admin: {is_demo_admin})")
    return user


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
        PatientEmergencyContact.objects.filter(patient=patient).order_by("id").first()
    )
    if not contact:
        contact = PatientEmergencyContact(patient=patient)
    contact.name = contact_name
    contact.relationship = random.choice(["Spouse", "Parent", "Sibling", "Caregiver"])
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


def build_demo_ssn(last4=None):
    last4_digits = "".join(char for char in str(last4 or "") if char.isdigit())
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
