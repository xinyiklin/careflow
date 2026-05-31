"""Phase 18: print the demo-accounts showcase summary."""

from django.conf import settings
from django.utils import timezone

from allergies.models import PatientAllergy
from appointments.models import Appointment
from clinical.models import Vitals
from medications.models import Medication, RefillRequest
from messaging.models import MessageThread


def seed(ctx):
    portal_patient = ctx.portal_patient
    if portal_patient is None:
        ctx.stdout.write("Demo user login:")
        ctx.stdout.write(f"  username: {getattr(settings, 'DEMO_USERNAME', 'demo')}")
        ctx.stdout.write("  password: Admin123!")
        ctx.stdout.write("Patient portal login:")
        ctx.stdout.write("  username: patient_demo")
        ctx.stdout.write("  password: Patient123!")
        return

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
        Medication.objects.filter(patient=portal_patient)
        .exclude(status=Medication.STATUS_ACTIVE)
        .count()
    )
    allergy_count = PatientAllergy.objects.filter(patient=portal_patient).count()
    vitals_count = Vitals.objects.filter(
        encounter__patient=portal_patient,
    ).count()

    threads_qs = MessageThread.objects.filter(patient=portal_patient)
    thread_total = threads_qs.count()
    thread_open = threads_qs.filter(status=MessageThread.STATUS_OPEN).count()
    thread_closed = threads_qs.filter(status=MessageThread.STATUS_CLOSED).count()
    thread_unread_patient = threads_qs.filter(unread_for_patient=True).count()

    refills_qs = RefillRequest.objects.filter(patient=portal_patient)
    refill_total = refills_qs.count()
    refill_pending = refills_qs.filter(status=RefillRequest.STATUS_PENDING).count()
    refill_approved = refills_qs.filter(status=RefillRequest.STATUS_APPROVED).count()
    refill_denied = refills_qs.filter(status=RefillRequest.STATUS_DENIED).count()

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
        ctx.stdout.write(line)
