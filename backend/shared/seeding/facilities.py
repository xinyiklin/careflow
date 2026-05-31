"""Phase 4-5: facilities, staff memberships, prescriber credentials, a staff
security-override example, and exam-room resources."""

from datetime import timedelta

from facilities.models import Facility, FacilityResource, Staff
from shared.models import Address
from users.demo_access import ensure_demo_user_is_org_owner

from .helpers import ensure_staff, get_role, get_title
from .templates import FACILITY_SPECS


def seed(ctx):
    _seed_facilities(ctx)
    _seed_staff(ctx)
    _seed_credentials_and_rooms(ctx)


def _seed_facilities(ctx):
    facilities = []
    for spec in FACILITY_SPECS:
        facility, created = Facility.objects.get_or_create(
            organization=ctx.org,
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
        ctx.write(f"  - {'Created' if created else 'Found'} facility: {facility.name}")

    ctx.facilities = facilities
    ctx.clinic_a, ctx.clinic_b, ctx.clinic_c = facilities


def _seed_staff(ctx):
    clinic_a, clinic_b, clinic_c = ctx.clinic_a, ctx.clinic_b, ctx.clinic_c

    clinic_a_admin_role = get_role(clinic_a, ["admin", "staff"])
    clinic_a_physician_role = get_role(clinic_a, ["physician"])
    clinic_a_nurse_role = get_role(clinic_a, ["nurse"])
    clinic_a_staff_role = get_role(clinic_a, ["staff"])
    clinic_a_md_title = get_title(clinic_a, ["md"])
    clinic_a_rn_title = get_title(clinic_a, ["rn"])
    clinic_a_mgr_title = get_title(clinic_a, ["mgr", "manager"])

    clinic_b_admin_role = get_role(clinic_b, ["admin", "staff"])
    clinic_b_physician_role = get_role(clinic_b, ["physician"])
    clinic_b_staff_role = get_role(clinic_b, ["staff"])
    clinic_b_md_title = get_title(clinic_b, ["md"])
    clinic_b_mgr_title = get_title(clinic_b, ["mgr", "manager"])

    clinic_c_admin_role = get_role(clinic_c, ["admin", "staff"])
    clinic_c_physician_role = get_role(clinic_c, ["physician"])
    clinic_c_nurse_role = get_role(clinic_c, ["nurse"])
    clinic_c_staff_role = get_role(clinic_c, ["staff"])
    clinic_c_md_title = get_title(clinic_c, ["md"])
    clinic_c_rn_title = get_title(clinic_c, ["rn"])
    clinic_c_mgr_title = get_title(clinic_c, ["mgr", "manager"])

    ensure_staff(
        ctx.admin_user,
        clinic_a,
        clinic_a_admin_role,
        clinic_a_mgr_title,
        is_default=True,
    )
    ensure_staff(ctx.admin_user, clinic_b, clinic_b_admin_role, clinic_b_mgr_title)
    ensure_staff(ctx.admin_user, clinic_c, clinic_c_admin_role, clinic_c_mgr_title)

    ensure_staff(
        ctx.facility_admin_user,
        clinic_b,
        clinic_b_admin_role,
        clinic_b_mgr_title,
        is_default=True,
    )
    ensure_staff(
        ctx.facility_admin_user, clinic_a, clinic_a_admin_role, clinic_a_mgr_title
    )

    ensure_demo_user_is_org_owner(ctx.admin_user)

    ensure_staff(
        ctx.doctor_user,
        clinic_a,
        clinic_a_physician_role,
        clinic_a_md_title,
        is_default=True,
    )
    ensure_staff(ctx.doctor_user, clinic_b, clinic_b_physician_role, clinic_b_md_title)

    ensure_staff(
        ctx.doctor2_user,
        clinic_c,
        clinic_c_physician_role,
        clinic_c_md_title,
        is_default=True,
    )
    ensure_staff(
        ctx.doctor2_user,
        clinic_a,
        clinic_a_physician_role,
        clinic_a_md_title,
    )

    ensure_staff(
        ctx.nurse_user,
        clinic_a,
        clinic_a_nurse_role,
        clinic_a_rn_title,
        is_default=True,
    )
    ensure_staff(ctx.nurse_user, clinic_c, clinic_c_nurse_role, clinic_c_rn_title)

    ensure_staff(ctx.staff_user, clinic_a, clinic_a_staff_role, None, is_default=True)
    ensure_staff(ctx.staff_user, clinic_b, clinic_b_staff_role, None)

    ensure_staff(ctx.staff2_user, clinic_c, clinic_c_staff_role, None, is_default=True)
    ensure_staff(ctx.staff2_user, clinic_b, clinic_b_staff_role, None)

    ctx.write("  - Staff memberships created across multiple facilities")


def _seed_credentials_and_rooms(ctx):
    # Physician staff get synthetic DEA/state-license/NPI values (demo only).
    # One nurse gets a per-staff security override to showcase the override
    # model. Provider resources (auto-created by Staff.save) get a default
    # room, plus a couple of shared rooms per facility — this runs before
    # appointments so they render a room.
    credential_today = ctx.today
    for physician in Staff.objects.filter(
        is_active=True, role__code="physician"
    ).select_related("user"):
        physician.npi = f"{1000000000 + physician.id:010d}"
        physician.dea_number = f"BX{2000000 + physician.id:07d}"
        physician.state_license_number = f"NY-{100000 + physician.id}"
        physician.state_license_state = "NY"
        physician.state_license_expiration = credential_today + timedelta(days=365)
        physician.dea_expiration = credential_today + timedelta(days=540)
        physician.save(
            update_fields=[
                "npi",
                "dea_number",
                "state_license_number",
                "state_license_state",
                "state_license_expiration",
                "dea_expiration",
            ]
        )

    nurse_staff = Staff.objects.filter(
        user=ctx.nurse_user, facility=ctx.clinic_a
    ).first()
    if nurse_staff:
        # Role template withholds clinical.sign from nurses; grant it here via a
        # per-staff override to demonstrate security overrides.
        nurse_staff.security_overrides = {"clinical.sign": True}
        nurse_staff.save(update_fields=["security_overrides"])

    for facility in ctx.facilities:
        provider_resources = FacilityResource.objects.filter(
            facility=facility, linked_staff__isnull=False
        ).order_by("id")
        for room_index, resource in enumerate(provider_resources, start=1):
            if not resource.default_room:
                resource.default_room = f"Exam Room {room_index}"
                resource.save(update_fields=["default_room"])
        for shared_room in ["Procedure Room", "Telehealth Room"]:
            FacilityResource.objects.get_or_create(
                facility=facility,
                name=shared_room,
                defaults={
                    "default_room": shared_room,
                    "is_active": True,
                    "is_deletable": True,
                },
            )
    ctx.write("  - Seeded prescriber credentials, a staff override, and exam rooms")
