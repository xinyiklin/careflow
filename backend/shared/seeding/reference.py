"""Phase 6-7: insurance carriers (+ org preferences) and the organization fee
schedule (+ items from the CPT catalog)."""

from decimal import Decimal

from billing.cpt_catalog import get_catalog_entries
from billing.models import OrganizationFeeSchedule, OrganizationFeeScheduleItem
from insurance.models import (
    InsuranceCarrier,
    OrganizationInsuranceCarrierPreference,
)

from .templates import CARRIER_SPECS


def seed(ctx):
    _seed_carriers(ctx)
    _seed_fee_schedule(ctx)


def _seed_carriers(ctx):
    carriers = []
    for carrier_spec in CARRIER_SPECS:
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
            organization=ctx.org,
            carrier=carrier,
            defaults={
                "is_preferred": True,
                "is_hidden": False,
                "is_active": True,
                "sort_order": index * 10,
            },
        )

    ctx.carriers = carriers


def _seed_fee_schedule(ctx):
    standard_fee_schedule, _ = OrganizationFeeSchedule.objects.update_or_create(
        organization=ctx.org,
        code="standard",
        defaults={
            "name": "Standard Fee Schedule",
            "is_default": True,
            "is_active": True,
            "updated_by": ctx.admin_user,
        },
    )
    if not standard_fee_schedule.created_by_id:
        standard_fee_schedule.created_by = ctx.admin_user
        standard_fee_schedule.save(update_fields=["created_by"])

    fee_schedule_items = {}
    for sort_index, entry in enumerate(get_catalog_entries(), start=1):
        item, _ = OrganizationFeeScheduleItem.objects.update_or_create(
            organization=ctx.org,
            schedule=standard_fee_schedule,
            service_code=entry["service_code"],
            defaults={
                "description": entry["description"],
                "default_units": Decimal("1.00"),
                "charge_amount": entry["charge_amount"],
                "place_of_service": "11",
                "is_active": True,
                "sort_order": sort_index * 10,
                "updated_by": ctx.admin_user,
            },
        )
        if not item.created_by_id:
            item.created_by = ctx.admin_user
            item.save(update_fields=["created_by"])
        fee_schedule_items[entry["service_code"]] = item

    ctx.standard_fee_schedule = standard_fee_schedule
    ctx.fee_schedule_items = fee_schedule_items
