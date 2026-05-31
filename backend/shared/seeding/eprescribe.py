"""Phase 17: e-prescribing flags, prescriber assignment, and delegations."""

from facilities.models import Staff
from medications.models import Medication, PrescriberDelegation
from patients.models import CareProvider


def seed(ctx):
    # Mark demo physicians e-prescribe enabled (drives the refill "Me" filter)
    # and assign every prescriber-less medication to an active physician
    # care-provider in its facility.
    Staff.objects.filter(is_active=True, role__code="physician").update(
        eprescribe_enabled=True
    )

    provider_by_facility = {}
    for medication in Medication.objects.filter(prescriber__isnull=True):
        facility_id = medication.facility_id
        if facility_id not in provider_by_facility:
            provider_by_facility[facility_id] = (
                CareProvider.objects.filter(
                    facility_id=facility_id,
                    linked_staff__isnull=False,
                    is_active=True,
                )
                .order_by("id")
                .first()
            )
        provider = provider_by_facility[facility_id]
        if provider is not None:
            medication.prescriber = provider
            medication.save(update_fields=["prescriber", "prescriber_name"])

    # Prescriber delegations: authorize one non-physician staff member per
    # facility to act as a prescriber's agent (non-controlled refill work).
    delegations_created = 0
    for facility in ctx.facilities:
        prescriber = (
            CareProvider.objects.filter(
                facility=facility,
                linked_staff__isnull=False,
                is_active=True,
            )
            .order_by("id")
            .first()
        )
        delegate = (
            Staff.objects.filter(facility=facility, is_active=True)
            .exclude(role__code="physician")
            .order_by("id")
            .first()
        )
        if prescriber and delegate:
            _, created = PrescriberDelegation.objects.get_or_create(
                facility=facility,
                prescriber=prescriber,
                delegate=delegate,
                defaults={"is_active": True},
            )
            delegations_created += int(created)
    ctx.write(f"  - Seeded {delegations_created} prescriber delegation(s)")
