from decimal import Decimal

from .cpt_catalog import get_catalog_entries
from .models import (
    FacilityFeeScheduleOverride,
    OrganizationFeeSchedule,
    OrganizationFeeScheduleItem,
)


def _resolve_schedule(facility, staff=None, payer_preference=None):
    """Payer > staff > facility > org default."""
    if payer_preference and getattr(payer_preference, "fee_schedule_id", None):
        return payer_preference.fee_schedule
    if staff and getattr(staff, "fee_schedule_id", None):
        return staff.fee_schedule
    if getattr(facility, "fee_schedule_id", None):
        return facility.fee_schedule
    return OrganizationFeeSchedule.objects.filter(
        organization=facility.organization,
        is_default=True,
        is_active=True,
    ).first()


def get_effective_fee_schedule_items(facility, staff=None, payer_preference=None):
    if not facility:
        return []

    overrides = {
        override.organization_item_id: override
        for override in FacilityFeeScheduleOverride.objects.filter(
            facility=facility,
            organization_item_id__isnull=False,
        ).select_related("organization_item")
    }
    effective_items = []

    resolved_schedule = _resolve_schedule(facility, staff, payer_preference)
    organization_filter = {
        "organization": facility.organization,
        "is_active": True,
    }
    if resolved_schedule:
        organization_filter["schedule"] = resolved_schedule
    else:
        organization_filter["schedule__isnull"] = True

    for item in OrganizationFeeScheduleItem.objects.filter(
        **organization_filter,
    ).order_by("sort_order", "service_code", "id"):
        override = overrides.get(item.id)
        if override and not override.is_active:
            continue

        effective_items.append(
            {
                "id": f"org:{item.id}",
                "organization_item": item.id,
                "facility_override": override.id if override else None,
                "catalog_source": "facility_override" if override else "organization",
                "service_code": item.service_code,
                "description": (
                    override.effective_description if override else item.description
                ),
                "default_units": (
                    override.effective_default_units if override else item.default_units
                ),
                "charge_amount": (
                    override.effective_charge_amount if override else item.charge_amount
                ),
                "modifier_1": (
                    override.get_effective_modifier("modifier_1")
                    if override
                    else item.modifier_1
                ),
                "modifier_2": (
                    override.get_effective_modifier("modifier_2")
                    if override
                    else item.modifier_2
                ),
                "modifier_3": (
                    override.get_effective_modifier("modifier_3")
                    if override
                    else item.modifier_3
                ),
                "modifier_4": (
                    override.get_effective_modifier("modifier_4")
                    if override
                    else item.modifier_4
                ),
                "place_of_service": (
                    override.effective_place_of_service
                    if override
                    else item.place_of_service
                ),
                "is_active": True,
                "sort_order": (
                    override.sort_order
                    if override and override.sort_order is not None
                    else item.sort_order
                ),
            }
        )

    for override in FacilityFeeScheduleOverride.objects.filter(
        facility=facility,
        organization_item_id__isnull=True,
        is_active=True,
    ).order_by("sort_order", "service_code", "id"):
        effective_items.append(
            {
                "id": f"facility:{override.id}",
                "organization_item": None,
                "facility_override": override.id,
                "catalog_source": "facility",
                "service_code": override.effective_service_code,
                "description": override.effective_description,
                "default_units": override.effective_default_units,
                "charge_amount": override.effective_charge_amount,
                "modifier_1": override.modifier_1,
                "modifier_2": override.modifier_2,
                "modifier_3": override.modifier_3,
                "modifier_4": override.modifier_4,
                "place_of_service": override.effective_place_of_service,
                "is_active": True,
                "sort_order": override.sort_order or 0,
            }
        )

    return sorted(
        effective_items,
        key=lambda item: (item["sort_order"], item["service_code"], item["id"]),
    )


def populate_fee_schedule_from_catalog(schedule, user=None):
    """Add all catalog CPT codes that don't already exist on this schedule."""
    existing_codes = set(
        OrganizationFeeScheduleItem.objects.filter(
            schedule=schedule,
        ).values_list("service_code", flat=True)
    )

    entries = get_catalog_entries()
    created = []
    for sort_order, entry in enumerate(entries, start=1):
        if entry["service_code"] in existing_codes:
            continue
        item = OrganizationFeeScheduleItem.objects.create(
            organization=schedule.organization,
            schedule=schedule,
            service_code=entry["service_code"],
            description=entry["description"],
            charge_amount=entry["charge_amount"],
            default_units=Decimal("1.00"),
            place_of_service="11",
            is_active=True,
            sort_order=sort_order * 10,
            created_by=user,
            updated_by=user,
        )
        created.append(item)

    return created


def copy_schedule_to_facility(source_schedule, facility, user=None):
    """Copy an org-level fee schedule into a facility-owned schedule."""
    code_suffix = f"-{facility.id}"
    base_code = source_schedule.code[: 64 - len(code_suffix)] + code_suffix

    new_schedule = OrganizationFeeSchedule.objects.create(
        organization=source_schedule.organization,
        facility=facility,
        source_schedule=source_schedule,
        name=f"{source_schedule.name}",
        code=base_code,
        is_default=not OrganizationFeeSchedule.objects.filter(
            facility=facility,
            is_default=True,
        ).exists(),
        is_active=True,
        created_by=user,
        updated_by=user,
    )

    source_items = OrganizationFeeScheduleItem.objects.filter(
        schedule=source_schedule,
    ).order_by("sort_order", "service_code", "id")

    for item in source_items:
        OrganizationFeeScheduleItem.objects.create(
            organization=source_schedule.organization,
            schedule=new_schedule,
            service_code=item.service_code,
            description=item.description,
            charge_amount=item.charge_amount,
            default_units=item.default_units,
            modifier_1=item.modifier_1,
            modifier_2=item.modifier_2,
            modifier_3=item.modifier_3,
            modifier_4=item.modifier_4,
            place_of_service=item.place_of_service,
            is_active=item.is_active,
            sort_order=item.sort_order,
            created_by=user,
            updated_by=user,
        )

    return new_schedule
