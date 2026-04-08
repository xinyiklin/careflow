from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from facilities.models import Facility, Staff, StaffRole, StaffTitle

User = get_user_model()


class Command(BaseCommand):
    help = "Seed demo data for the modular Clinic Scheduler"

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding data...")

        # 1. Create Admin User
        admin_user, _ = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@example.com",
                "first_name": "System",
                "last_name": "Admin",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        admin_user.set_password("Admin123!")
        admin_user.save(update_fields=["password"])

        # 2. Create Facility
        facility, _ = Facility.objects.get_or_create(
            name="Demo Clinic",
            defaults={"address": "123 Main St, New York, NY"},
        )

        facility.save()  # ensure seed logic runs

        # 3. Fetch Roles & Titles safely
        admin_role = StaffRole.objects.filter(
            facility=facility, code="admin"
        ).first()

        physician_role = StaffRole.objects.filter(
            facility=facility, code="physician"
        ).first()

        md_title = StaffTitle.objects.filter(
            facility=facility, code="md"
        ).first()

        if not admin_role or not physician_role:
            self.stdout.write(self.style.ERROR("Required roles not found."))
            return

        # Ensure active
        admin_role.is_active = True
        admin_role.save()

        physician_role.is_active = True
        physician_role.save()

        if md_title:
            md_title.is_active = True
            md_title.save()

        # 4. Link Admin Staff
        Staff.objects.get_or_create(
            user=admin_user,
            facility=facility,
            defaults={"role": admin_role},
        )

        # 5. Create Doctor User
        doctor_user, _ = User.objects.get_or_create(
            username="dr_smith",
            defaults={
                "email": "drsmith@example.com",
                "first_name": "John",
                "last_name": "Smith",
            },
        )
        doctor_user.set_password("Doctor123!")
        doctor_user.save(update_fields=["password"])

        # 6. Link Physician Staff
        Staff.objects.get_or_create(
            user=doctor_user,
            facility=facility,
            defaults={
                "role": physician_role,
                "title": md_title,
            },
        )

        self.stdout.write(self.style.SUCCESS("Successfully seeded Demo Clinic data"))