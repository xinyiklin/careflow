"""Phase 1-3: organization, users, memberships, and org security roles."""

from organizations.models import (
    Organization,
    OrganizationMembership,
    OrganizationRole,
)
from organizations.security import get_org_role_security_template
from shared.models import Address

from .helpers import create_user


def seed(ctx):
    _seed_organization(ctx)
    _seed_users(ctx)
    _seed_memberships(ctx)
    _seed_org_roles(ctx)


def _seed_organization(ctx):
    org, _ = Organization.objects.get_or_create(
        slug="careflow-demo",
        defaults={
            "name": "CareFlow Demo Organization",
            "legal_name": "CareFlow Demo Medical Group, PLLC",
            "phone_number": "(212) 555-0100",
            "email": "ops@careflow.xinyiklin.com",
            "website": "https://careflow-demo.local",
            "tax_id": "12-3456789",
            "notes": "Demo organization used for local development and QA workflows.",
        },
    )
    org.name = "CareFlow Demo Organization"
    org.legal_name = "CareFlow Demo Medical Group, PLLC"
    org.phone_number = "(212) 555-0100"
    org.email = "ops@careflow.xinyiklin.com"
    org.website = "https://careflow-demo.local"
    org.tax_id = "12-3456789"
    org.notes = "Demo organization used for local development and QA workflows."
    if not org.address_id:
        org.address = Address.objects.create(
            line_1="100 CareFlow Plaza",
            city="New York",
            state="NY",
            zip_code="10001",
        )
    org.save()
    ctx.org = org


def _seed_users(ctx):
    from django.conf import settings

    ctx.admin_user = create_user(
        ctx,
        getattr(settings, "DEMO_USERNAME", "demo"),
        "demo@careflow.xinyiklin.com",
        "Demo",
        "User",
    )
    ctx.doctor_user = create_user(
        ctx, "demo_doctor", "doctor@careflow.xinyiklin.com", "Elliot", "Reed"
    )
    ctx.doctor2_user = create_user(
        ctx, "demo_doctor2", "doctor2@careflow.xinyiklin.com", "Nadia", "Solano"
    )
    ctx.nurse_user = create_user(
        ctx, "demo_nurse", "nurse@careflow.xinyiklin.com", "Theo", "Park"
    )
    ctx.staff_user = create_user(
        ctx, "demo_staff", "staff@careflow.xinyiklin.com", "Iris", "Cole"
    )
    ctx.staff2_user = create_user(
        ctx, "demo_staff2", "staff2@careflow.xinyiklin.com", "Jonah", "Vale"
    )
    ctx.facility_admin_user = create_user(
        ctx,
        "demo_facility_admin",
        "facilityadmin@careflow.xinyiklin.com",
        "Amara",
        "Stone",
    )


def _seed_memberships(ctx):
    membership_map = {
        ctx.admin_user: "owner",
        ctx.facility_admin_user: "admin",
        ctx.doctor_user: "member",
        ctx.doctor2_user: "member",
        ctx.nurse_user: "member",
        ctx.staff_user: "member",
        ctx.staff2_user: "member",
    }

    for user, role in membership_map.items():
        membership, created = OrganizationMembership.objects.get_or_create(
            user=user,
            defaults={
                "organization": ctx.org,
                "role": role,
                "is_active": True,
            },
        )
        if not created:
            membership.organization = ctx.org
            membership.role = role
            membership.is_active = True
            membership.save()


def _seed_org_roles(ctx):
    # The system-role migration only seeds orgs that existed when it ran, so the
    # seeder-created demo org has no OrganizationRole rows. Create them and
    # populate security_permissions from the role templates so the org security
    # panel showcases the owner/admin/member permission model.
    org_role_specs = [
        ("owner", "Owner", "Full organization access and billing control"),
        ("admin", "Admin", "Full workspace configuration access"),
        ("member", "Member", "Standard clinical access"),
    ]
    for code, role_name, role_description in org_role_specs:
        OrganizationRole.objects.update_or_create(
            organization=ctx.org,
            code=code,
            defaults={
                "name": role_name,
                "description": role_description,
                "is_system_role": True,
                "is_deletable": False,
                "is_active": True,
                "security_permissions": get_org_role_security_template(code),
            },
        )
    ctx.write("  - Seeded organization security roles")
