"""Phase 8-12 (per facility): care providers, pharmacies, facility overrides,
patients (+ demographics/contacts/insurance), medications, allergies,
documents, appointments, and the clinical flow (encounters/notes/vitals/
billing).

This whole block runs inside the orchestrator's ``for facility in
ctx.facilities`` loop, in the original order, so the global RNG stream is
identical to the pre-refactor command.
"""

import random
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.utils import timezone

from allergies.models import PatientAllergy
from appointments.models import Appointment
from billing.models import (
    EncounterBillingRecord,
    EncounterChargeLine,
    EncounterDiagnosis,
    FacilityFeeScheduleOverride,
)
from clinical.models import Encounter, ProgressNote, Vitals
from facilities.models import (
    AppointmentStatus,
    AppointmentType,
    FacilityResource,
    PatientGender,
    Staff,
)
from insurance.models import (
    FacilityInsuranceCarrierOverride,
    OrganizationInsuranceCarrierPreference,
    PatientInsurancePolicy,
)
from medications.models import Medication, RefillRequest
from organizations.models import (
    FacilityPharmacyPreferenceOverride,
    OrganizationPharmacyPreference,
)
from patients.document_storage import get_patient_document_storage
from patients.models import (
    CareProvider,
    Patient,
    PatientDocument,
    Pharmacy,
    ensure_default_document_categories,
)
from patients.sample_documents import SAMPLE_DOCUMENTS, save_sample_pdf
from shared.models import Address

from .helpers import (
    build_demo_ssn,
    demo_demographics,
    get_primary_payer_name,
    normalize_demo_patient_ssn,
    sync_emergency_contact,
    sync_patient_phone,
)
from .templates import (
    ALLERGY_TEMPLATES,
    CLINICAL_NOTE_TEMPLATES,
    FIRST_NAMES,
    LAST_NAMES,
    MEDICATION_TEMPLATES,
    REASONS,
)

PATIENT_COUNTS = {"A": 30, "B": 22, "C": 24}
APPOINTMENTS_PER_DAY = {"A": 18, "B": 12, "C": 14}

# Clinic A's first patient is deterministically the portal demo "Demo Patient"
# (fixed identity), so a no-flush re-run matches it by (first, last, dob) and
# never creates a duplicate or orphans it from per-facility clinical seeding.
PORTAL_DEMO_DOB = date(1985, 5, 15)


def seed_medications_for_patient(ctx, patient, patient_index, provider_name):
    if patient_index % 6 == 0:
        return

    active_template = MEDICATION_TEMPLATES[patient_index % len(MEDICATION_TEMPLATES)]
    Medication.objects.create(
        patient=patient,
        facility=patient.facility,
        status=Medication.STATUS_ACTIVE,
        start_date=ctx.today - timedelta(days=90 + patient_index),
        prescriber_name=provider_name,
        created_by=ctx.admin_user,
        updated_by=ctx.admin_user,
        **active_template,
    )

    if patient_index % 4 == 0:
        historical_template = MEDICATION_TEMPLATES[
            (patient_index + 1) % len(MEDICATION_TEMPLATES)
        ]
        Medication.objects.create(
            patient=patient,
            facility=patient.facility,
            status=Medication.STATUS_DISCONTINUED,
            start_date=ctx.today - timedelta(days=220 + patient_index),
            end_date=ctx.today - timedelta(days=30 + patient_index),
            prescriber_name=provider_name,
            notes="Previously discontinued after medication reconciliation.",
            created_by=ctx.admin_user,
            updated_by=ctx.admin_user,
            **{
                key: value
                for key, value in historical_template.items()
                if key != "notes"
            },
        )


def seed_allergies_for_patient(ctx, patient, patient_index):
    if patient_index % 4 == 0:
        return

    allergy_template = ALLERGY_TEMPLATES[patient_index % len(ALLERGY_TEMPLATES)]
    PatientAllergy.objects.create(
        patient=patient,
        facility=patient.facility,
        onset_date=ctx.today - timedelta(days=365 + patient_index),
        status=PatientAllergy.STATUS_ACTIVE,
        created_by=ctx.admin_user,
        updated_by=ctx.admin_user,
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
            onset_date=ctx.today - timedelta(days=800 + patient_index),
            status=PatientAllergy.STATUS_RESOLVED,
            notes="Historic seasonal symptoms, currently resolved.",
            created_by=ctx.admin_user,
            updated_by=ctx.admin_user,
        )


def create_billing_record(ctx, encounter, template, sequence):
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
        created_by=ctx.admin_user,
        updated_by=ctx.admin_user,
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


def seed_clinical_flow_for_facility(ctx, facility, appointments):
    today = ctx.today
    admin_user = ctx.admin_user
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
        template = CLINICAL_NOTE_TEMPLATES[(index - 1) % len(CLINICAL_NOTE_TEMPLATES)]
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

        # Seed deterministic-but-varied vitals (skip every 5th visit so the
        # portal renders a "no vitals" state for some encounters).
        if index % 5 != 0:
            Vitals.objects.create(
                encounter=encounter,
                height_cm=Decimal("170") + Decimal((index % 20) - 10),
                weight_kg=Decimal("72") + Decimal((index * 3 % 25) - 10),
                bp_systolic=110 + (index * 7 % 30),
                bp_diastolic=68 + (index * 5 % 20),
                heart_rate_bpm=64 + (index * 3 % 26),
                respiratory_rate=14 + (index % 6),
                temperature_c=Decimal("36.5") + Decimal(index % 7) / Decimal("10"),
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
            create_billing_record(ctx, encounter, template, index)


def seed_facility(ctx, facility):
    today = ctx.today
    admin_user = ctx.admin_user

    statuses = list(AppointmentStatus.objects.filter(facility=facility, is_active=True))
    types = list(AppointmentType.objects.filter(facility=facility, is_active=True))
    genders = list(PatientGender.objects.filter(facility=facility, is_active=True))

    if not statuses or not types or not genders:
        ctx.stdout.write(
            ctx.style.WARNING(
                f"  - Skipping {facility.name}: missing seeded config data"
            )
        )
        return

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

    if facility == ctx.clinic_a:
        FacilityFeeScheduleOverride.objects.update_or_create(
            facility=facility,
            organization_item=ctx.fee_schedule_items["99214"],
            defaults={
                "charge_amount": Decimal("158.00"),
                "is_active": True,
                "sort_order": 10,
                "updated_by": admin_user,
            },
        )
    if facility == ctx.clinic_b:
        FacilityFeeScheduleOverride.objects.update_or_create(
            facility=facility,
            organization_item=ctx.fee_schedule_items["99214"],
            defaults={
                "charge_amount": Decimal("175.00"),
                "is_active": True,
                "sort_order": 20,
                "updated_by": admin_user,
            },
        )
    if facility == ctx.clinic_c:
        empire_preference = OrganizationInsuranceCarrierPreference.objects.filter(
            organization=ctx.org,
            carrier__name="Empire Health",
        ).first()
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
        facility_org_pharmacy_pref = OrganizationPharmacyPreference.objects.filter(
            organization=ctx.org, pharmacy=pharmacy
        ).first()
        if facility_org_pharmacy_pref:
            FacilityPharmacyPreferenceOverride.objects.update_or_create(
                facility=facility,
                organization_preference=facility_org_pharmacy_pref,
                defaults={
                    "is_preferred": False,
                    "is_hidden": False,
                    "is_active": True,
                    "notes": ("Facility-level pharmacy preference override for demo."),
                    "sort_order": 30,
                },
            )

    patients = []
    used_patient_keys = set()

    target_patient_count = PATIENT_COUNTS[facility.facility_code]

    while len(patients) < target_patient_count:
        # The first Clinic A patient is the portal demo, with a fixed identity
        # so re-runs match it instead of creating a duplicate.
        is_portal_demo = facility.facility_code == "A" and len(patients) == 0
        if is_portal_demo:
            first_name, last_name, dob = "Demo", "Patient", PORTAL_DEMO_DOB
        else:
            first_name = random.choice(FIRST_NAMES)
            last_name = random.choice(LAST_NAMES)
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
        # Draw every random pick up-front so RNG consumption per iteration is
        # unconditional — identical whether the patient is created fresh or
        # already exists — which keeps no-flush re-runs deterministic. (The
        # old ``field or random.choice(...)`` re-normalization consumed the RNG
        # only when a loaded value was falsy, diverging the stream on re-runs.)
        gender_choice = random.choice(genders)
        middle_choice = random.choice(["A", "J", "M", ""])
        sex_choice = random.choice(["female", "male", "unknown", "undisclosed"])
        language_choice = random.choice(["English", "Spanish", "Mandarin", "Bengali"])
        pronouns_choice = random.choice(["she/her", "he/him", "they/them", ""])
        pcp_choice = random.choice(
            list(CareProvider.objects.filter(facility=facility, is_active=True))
        )
        patient, _ = Patient.objects.get_or_create(
            facility=facility,
            first_name=first_name,
            last_name=last_name,
            date_of_birth=dob,
            defaults={
                "gender": gender_choice,
                "middle_name": middle_choice,
                "preferred_name": first_name,
                "sex_at_birth": sex_choice,
                "preferred_language": language_choice,
                "pronouns": pronouns_choice,
                **demographic_defaults,
                "email": (
                    f"{first_name.lower()}.{last_name.lower()}{patient_index}"
                    "@demo-patient.local"
                ),
                "ssn": demo_ssn,
                "ssn_last4": demo_ssn[-4:],
                "pcp": pcp_choice,
                "referring_provider": external_referrer,
                "preferred_pharmacy": pharmacy,
                "is_active": True,
            },
        )

        # Normalize existing patient fields too (using the pre-drawn picks).
        patient.gender = patient.gender or gender_choice
        patient.is_active = True
        patient.middle_name = patient.middle_name or middle_choice
        patient.preferred_name = patient.preferred_name or patient.first_name
        patient.sex_at_birth = patient.sex_at_birth or sex_choice
        if not patient.race and not patient.race_declined:
            patient.race = demographic_defaults["race"]
            patient.race_declined = demographic_defaults["race_declined"]
        if not patient.ethnicity and not patient.ethnicity_declined:
            patient.ethnicity = demographic_defaults["ethnicity"]
            patient.ethnicity_declined = demographic_defaults["ethnicity_declined"]
        patient.preferred_language = patient.preferred_language or language_choice
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
                zip_code=(facility.address.zip_code if facility.address else "10001"),
            )
        patient.save()
        sync_patient_phone(patient, facility, patient_index)
        sync_emergency_contact(patient, patient_index)

        carrier_choice = random.choice(ctx.carriers)
        plan_choice = random.choice(["Gold PPO", "Silver HMO", "Community Plan"])
        PatientInsurancePolicy.objects.get_or_create(
            patient=patient,
            carrier=carrier_choice,
            member_id=f"{facility.facility_code or facility.id}-{patient_index:06d}",
            defaults={
                "plan_name": plan_choice,
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
    Encounter.objects.filter(facility=facility, patient__in=demo_patient_qs).delete()
    # ``Medication`` is the protected target of ``RefillRequest``; clear seeded
    # refills first so the medication reset below can cascade cleanly on every
    # re-run.
    RefillRequest.objects.filter(
        facility=facility, patient__in=demo_patient_qs
    ).delete()
    Medication.objects.filter(facility=facility, patient__in=demo_patient_qs).delete()
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
        seed_medications_for_patient(ctx, patient, patient_index, provider_name)
        seed_allergies_for_patient(ctx, patient, patient_index)

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
    base_daily_count = APPOINTMENTS_PER_DAY[facility.facility_code]
    created_appointments = []

    for day_offset in range(-21, 7):
        visit_date = today + timedelta(days=day_offset)
        if visit_date.isoweekday() not in (facility.operating_days or []):
            continue

        variation = random.choice([0.3, 0.45, 0.55, 0.65, 0.75, 0.85, 1.0, 1.0, 1.0])
        daily_count = max(1, int(base_daily_count * variation))

        start_minute = (
            facility.operating_start_time.hour * 60
            + facility.operating_start_time.minute
        )
        end_minute = (
            facility.operating_end_time.hour * 60 + facility.operating_end_time.minute
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
                FacilityResource.objects.filter(linked_staff=rendering_provider).first()
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
                reason=random.choice(REASONS),
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

    seed_clinical_flow_for_facility(ctx, facility, created_appointments)

    ctx.write(
        f"  - Seeded {facility.name}: {len(patients)} patients, appointments, "
        "clinical records, meds, allergies, and billing workflow data"
    )
