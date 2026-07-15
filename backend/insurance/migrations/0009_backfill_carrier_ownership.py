"""Backfill tenant ownership for pre-existing private insurance carriers.

Migration 0008 added ``source`` / ``owning_organization`` / ``owning_facility``
to InsuranceCarrier. Unlike Pharmacy, the carrier ``source`` column did not exist
before 0008, so every legacy row — global directory carriers and tenant-private
custom carriers alike — took the ``source="directory"`` field default. ``source``
therefore cannot distinguish them here.

Global carriers come from the seeded ``CARRIER_DIRECTORY`` (natural key
``payer_id``). Any carrier whose ``payer_id`` is not in that directory is a
tenant-created custom carrier: attribute it to the facility that overrides it
directly, else the organization that holds its preference. Seeded and unlinked
carriers stay ownerless.
"""

from django.db import migrations


def backfill_carrier_ownership(apps, schema_editor):
    from insurance.carrier_directory import CARRIER_DIRECTORY

    InsuranceCarrier = apps.get_model("insurance", "InsuranceCarrier")
    FacilityOverride = apps.get_model("insurance", "FacilityInsuranceCarrierOverride")
    OrgPreference = apps.get_model(
        "insurance", "OrganizationInsuranceCarrierPreference"
    )

    seed_payer_ids = {payer_id for _name, payer_id, *_rest in CARRIER_DIRECTORY}

    candidates = InsuranceCarrier.objects.filter(
        owning_organization__isnull=True,
        owning_facility__isnull=True,
    )

    for carrier in candidates.iterator():
        # A carrier that matches a seeded directory payer id is global.
        if carrier.payer_id and carrier.payer_id in seed_payer_ids:
            continue

        facility_id = (
            FacilityOverride.objects.filter(carrier_id=carrier.pk)
            .exclude(facility__isnull=True)
            .values_list("facility_id", flat=True)
            .order_by("facility_id")
            .first()
        )
        if facility_id is not None:
            carrier.owning_facility_id = facility_id
            carrier.save(update_fields=["owning_facility"])
            continue

        organization_id = (
            OrgPreference.objects.filter(carrier_id=carrier.pk)
            .values_list("organization_id", flat=True)
            .order_by("organization_id")
            .first()
        )
        if organization_id is not None:
            carrier.owning_organization_id = organization_id
            carrier.save(update_fields=["owning_organization"])


def clear_carrier_ownership(apps, schema_editor):
    from insurance.carrier_directory import CARRIER_DIRECTORY

    InsuranceCarrier = apps.get_model("insurance", "InsuranceCarrier")
    seed_payer_ids = {payer_id for _name, payer_id, *_rest in CARRIER_DIRECTORY}
    InsuranceCarrier.objects.exclude(payer_id__in=seed_payer_ids).update(
        owning_organization=None,
        owning_facility=None,
    )


class Migration(migrations.Migration):

    dependencies = [
        ("insurance", "0008_insurancecarrier_directory_source_and_more"),
        ("organizations", "0008_seed_system_org_roles"),
    ]

    operations = [
        migrations.RunPython(
            backfill_carrier_ownership,
            clear_carrier_ownership,
        ),
    ]
