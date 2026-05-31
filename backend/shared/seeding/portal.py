"""Phase 13-16: patient-portal demo account (named "Demo Patient"), online
scheduling slots, refill requests + message threads, vitals backfill, preferred
pharmacy, and the clinical top-up.

Runs after all per-facility seeding. Consumes no RNG, so its position relative
to the patient loop does not affect determinism.
"""

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Count
from django.utils import timezone

from allergies.models import PatientAllergy
from clinical.models import Encounter, Vitals
from facilities.models import AppointmentType, Staff
from medications.models import Medication, RefillRequest
from messaging.models import Message, MessageThread
from patients.models import Patient, PatientPharmacy, Pharmacy
from patients.pharmacy_access import get_effective_pharmacy_ids
from users.portal import PatientPortalAccount


def seed(ctx):
    portal_patient = _select_portal_patient()
    ctx.portal_patient = portal_patient

    if portal_patient is None:
        ctx.write("  - Skipped portal demo account (no demo patients found)")
        return

    _seed_portal_account(ctx, portal_patient)
    _seed_online_scheduling(ctx, portal_patient)
    _seed_refills_messaging_and_topup(ctx, portal_patient)


def _select_portal_patient():
    # Prefer an already-bound portal account so a re-run keeps the same demo
    # patient (and the same showcase data). Fall back to the seed patient with
    # the richest clinical data on first run.
    existing_portal_account = (
        PatientPortalAccount.objects.filter(user__username="patient_demo")
        .select_related("patient")
        .first()
    )
    if existing_portal_account and existing_portal_account.patient_id:
        return Patient.objects.filter(pk=existing_portal_account.patient_id).first()

    # The seeder designates a deterministic "Demo Patient" (Clinic A's first
    # patient); prefer it so the portal demo is stable across re-runs.
    demo_patient = (
        Patient.objects.filter(
            email__endswith="@demo-patient.local",
            first_name="Demo",
            last_name="Patient",
        )
        .order_by("id")
        .first()
    )
    if demo_patient:
        return demo_patient

    # Fallback (no designated demo patient found): richest-data patient.
    return (
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


def _seed_portal_account(ctx, portal_patient):
    User = get_user_model()

    # Make the portal demo patient unmistakably the demo account. The portal UI
    # displays the Patient record's name (not the User's), so set it here; the
    # patient_demo User mirrors it below, and the message threads seeded
    # afterward pick up "Demo Patient" too.
    if (
        portal_patient.first_name != "Demo"
        or portal_patient.last_name != "Patient"
        or portal_patient.preferred_name != "Demo"
    ):
        portal_patient.first_name = "Demo"
        portal_patient.last_name = "Patient"
        portal_patient.preferred_name = "Demo"
        portal_patient.save(update_fields=["first_name", "last_name", "preferred_name"])

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

    ctx.write(
        f"  - {'Created' if portal_created else 'Updated'} portal user: "
        f"patient_demo → {portal_patient}"
    )


def _seed_online_scheduling(ctx, portal_patient):
    from appointments.models import BookableSlot

    admin_user = ctx.admin_user
    demo_facility = portal_patient.facility
    demo_facility.online_cancellation_enabled = True
    demo_facility.cancellation_cutoff_hours = 24
    demo_facility.online_scheduling_disabled = False
    demo_facility.save()

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

    bookable_types_for_slots = list(
        AppointmentType.objects.filter(facility=demo_facility, bookable_online=True)
    )
    slot_hours = [(9, 0), (10, 30), (14, 0)]
    now = timezone.now()
    slots_created = 0
    for provider in demo_providers:
        if not bookable_types_for_slots:
            break
        for day_offset in range(1, 15):
            base = (now + timedelta(days=day_offset)).replace(microsecond=0, second=0)
            for slot_index, (hour, minute) in enumerate(slot_hours):
                start = base.replace(hour=hour, minute=minute)
                if start <= now:
                    continue
                appt_type = bookable_types_for_slots[
                    (day_offset + slot_index) % len(bookable_types_for_slots)
                ]
                end = start + timedelta(minutes=appt_type.duration_minutes or 30)
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
    ctx.write(f"  - Created {slots_created} bookable slots for online scheduling")


def _seed_refill_requests(ctx, patient):
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


def _seed_resolved_refill_requests(ctx, patient):
    """Seed one approved and one denied refill so history pages render."""
    admin_user = ctx.admin_user
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
            patient_note=("Hi — could I get a refill on this prescription? " "Thanks!"),
            clinician_note=("Approved — pickup ready at preferred pharmacy."),
            resolved_at=timezone.now() - timedelta(days=14),
            resolved_by=admin_user,
        )
        RefillRequest.objects.filter(pk=approved.pk).update(
            requested_at=timezone.now() - timedelta(days=16),
            resolved_at=timezone.now() - timedelta(days=14),
        )
        created_any = True

    denied_medication = (
        active_medications[1] if len(active_medications) > 1 else active_medications[0]
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
            clinician_note=("Please schedule a follow-up visit before refilling."),
            resolved_at=timezone.now() - timedelta(days=10),
            resolved_by=admin_user,
        )
        RefillRequest.objects.filter(pk=denied.pk).update(
            requested_at=timezone.now() - timedelta(days=12),
            resolved_at=timezone.now() - timedelta(days=10),
        )
        created_any = True

    return created_any


def _seed_pharmacy_refill_request(ctx, patient):
    """Seed one pharmacy-originated refill so the clinician queue shows the
    electronic intake path (source=pharmacy), not only patient requests. Uses
    an active medication without an existing pending refill to respect the
    one-pending-per-medication constraint."""
    if RefillRequest.objects.filter(
        patient=patient,
        source=RefillRequest.SOURCE_PHARMACY,
    ).exists():
        return False

    pending_med_ids = set(
        RefillRequest.objects.filter(
            patient=patient,
            status=RefillRequest.STATUS_PENDING,
        ).values_list("medication_id", flat=True)
    )
    medication = (
        Medication.objects.filter(
            patient=patient,
            status=Medication.STATUS_ACTIVE,
        )
        .exclude(id__in=pending_med_ids)
        .order_by("id")
        .first()
    )
    if not medication:
        return False

    pharmacy = patient.preferred_pharmacy
    RefillRequest.objects.create(
        medication=medication,
        patient=patient,
        facility=patient.facility,
        pharmacy=pharmacy,
        pharmacy_name=(pharmacy.name if pharmacy else ""),
        source=RefillRequest.SOURCE_PHARMACY,
        status=RefillRequest.STATUS_PENDING,
        patient_note="",
        clinician_note=("Refill request received electronically from the pharmacy."),
    )
    return True


def _seed_message_threads(ctx, patient):
    subject = "Question about my medication"
    if MessageThread.objects.filter(patient=patient, subject=subject).exists():
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


def _seed_reply_message_thread(ctx, patient):
    """Seed an open thread with a clinician reply still unread."""
    admin_user = ctx.admin_user
    subject = "Lab results from last visit"
    if MessageThread.objects.filter(patient=patient, subject=subject).exists():
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

    MessageThread.objects.filter(pk=thread.pk).update(
        unread_for_clinician=False,
        unread_for_patient=True,
    )
    return True


def _seed_closed_message_thread(ctx, patient):
    """Seed a closed thread with patient + clinician + close message."""
    admin_user = ctx.admin_user
    subject = "Pharmacy hours question"
    if MessageThread.objects.filter(patient=patient, subject=subject).exists():
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


def _seed_portal_patient_vitals(ctx, patient):
    """Ensure the most recent signed encounters carry a vitals row."""
    admin_user = ctx.admin_user
    recent_signed = list(
        Encounter.objects.filter(
            patient=patient,
            status=Encounter.STATUS_SIGNED,
        ).order_by("-started_at")[:3]
    )
    if not recent_signed:
        return 0

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


def _ensure_portal_patient_preferred_pharmacy(ctx, patient):
    """Ensure the portal patient has a default PatientPharmacy row."""
    allowed_ids = get_effective_pharmacy_ids(patient.facility)
    if not allowed_ids:
        return False

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


def _seed_portal_patient_clinical_topup(ctx, patient):
    """Guarantee the portal patient has rich medication + allergy data."""
    today = ctx.today
    admin_user = ctx.admin_user
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
    existing_allergies = PatientAllergy.objects.filter(patient=patient).count()

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


def _seed_refills_messaging_and_topup(ctx, portal_patient):
    refill_created = _seed_refill_requests(ctx, portal_patient)
    resolved_refills_created = _seed_resolved_refill_requests(ctx, portal_patient)
    thread_created = _seed_message_threads(ctx, portal_patient)
    reply_thread_created = _seed_reply_message_thread(ctx, portal_patient)
    closed_thread_created = _seed_closed_message_thread(ctx, portal_patient)
    vitals_created = _seed_portal_patient_vitals(ctx, portal_patient)
    pharmacy_updated = _ensure_portal_patient_preferred_pharmacy(ctx, portal_patient)
    (
        clinical_active_added,
        clinical_inactive_added,
        clinical_allergies_added,
    ) = _seed_portal_patient_clinical_topup(ctx, portal_patient)
    pharmacy_refill_created = _seed_pharmacy_refill_request(ctx, portal_patient)
    # Refresh so summary queries reflect the PatientPharmacy cascade.
    portal_patient.refresh_from_db()

    ctx.write(
        f"  - Portal demo refill {'created' if refill_created else 'skipped'}; "
        f"resolved refills {'created' if resolved_refills_created else 'skipped'}; "
        f"open thread {'created' if thread_created else 'skipped'}; "
        f"reply thread {'created' if reply_thread_created else 'skipped'}; "
        f"closed thread {'created' if closed_thread_created else 'skipped'}; "
        f"vitals backfilled: {vitals_created}; "
        f"preferred pharmacy {'set' if pharmacy_updated else 'unchanged'}; "
        f"clinical top-up — active meds: +{clinical_active_added}, "
        f"inactive meds: +{clinical_inactive_added}, "
        f"allergies: +{clinical_allergies_added}; "
        f"pharmacy refill {'created' if pharmacy_refill_created else 'skipped'}"
    )
