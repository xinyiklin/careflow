"""Backfill tenant ownership for pre-existing private pharmacies.

Migration 0019 added the nullable ``owning_organization`` / ``owning_facility``
columns but left every existing row NULL. The new directory endpoints treat a
NULL/NULL pharmacy as a global, ownerless record that every tenant can list and
link, so any custom pharmacy created before 0019 would leak across tenants and
become un-editable by its own owner.

Custom pharmacies carry ``source != "directory"`` (directory rows are seeded with
``source="directory"``), so we can attribute them precisely: a private pharmacy
is owned by the facility that overrides it directly, else the organization that
holds its preference. Seeded directory pharmacies stay ownerless.
"""

from django.db import migrations


def backfill_pharmacy_ownership(apps, schema_editor):
    Pharmacy = apps.get_model("patients", "Pharmacy")
    FacilityOverride = apps.get_model(
        "organizations", "FacilityPharmacyPreferenceOverride"
    )
    OrgPreference = apps.get_model("organizations", "OrganizationPharmacyPreference")

    # Only non-directory (custom/imported) rows can be tenant-owned.
    candidates = Pharmacy.objects.exclude(source="directory").filter(
        owning_organization__isnull=True,
        owning_facility__isnull=True,
    )

    for pharmacy in candidates.iterator():
        facility_id = (
            FacilityOverride.objects.filter(pharmacy_id=pharmacy.pk)
            .exclude(facility__isnull=True)
            .values_list("facility_id", flat=True)
            .order_by("facility_id")
            .first()
        )
        if facility_id is not None:
            pharmacy.owning_facility_id = facility_id
            pharmacy.save(update_fields=["owning_facility"])
            continue

        organization_id = (
            OrgPreference.objects.filter(pharmacy_id=pharmacy.pk)
            .values_list("organization_id", flat=True)
            .order_by("organization_id")
            .first()
        )
        if organization_id is not None:
            pharmacy.owning_organization_id = organization_id
            pharmacy.save(update_fields=["owning_organization"])


def clear_pharmacy_ownership(apps, schema_editor):
    Pharmacy = apps.get_model("patients", "Pharmacy")
    Pharmacy.objects.exclude(source="directory").update(
        owning_organization=None,
        owning_facility=None,
    )


class Migration(migrations.Migration):

    dependencies = [
        ("patients", "0019_pharmacy_owning_facility_and_more"),
        ("organizations", "0008_seed_system_org_roles"),
    ]

    operations = [
        migrations.RunPython(
            backfill_pharmacy_ownership,
            clear_pharmacy_ownership,
        ),
    ]
