from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from facilities.models import Facility, Staff, StaffRole, StaffTitle

User = get_user_model()

class Command(BaseCommand):
    help = "Seed demo data for the modular Clinic Scheduler"

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding data...")

        # 1. Create Admin User
        admin_user, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@example.com",
                "first_name": "System",
                "last_name": "Admin",
                "is_staff": True,
                "is_superuser": True,
            }
        )
        if created:
            admin_user.set_password("Admin123!")
            admin_user.save()

        # 2. Create Facility 
        facility, _ = Facility.objects.get_or_create(
            name="Demo Clinic",
            defaults={"address": "123 Main St, New York, NY"}
        )

        # 3. Fetch Role Instances
        admin_role = StaffRole.objects.get(facility=facility, code="admin")
        physician_role = StaffRole.objects.get(facility=facility, code="physician")
        md_title = StaffTitle.objects.get(facility=facility, code="md")

        # 4. Create Staff Link (Admin)
        Staff.objects.get_or_create(
            user=admin_user,
            facility=facility,
            defaults={"role": admin_role} # Passing the instance
        )

        # 5. Create Doctor User
        doctor_user, created = User.objects.get_or_create(
            username="dr_smith",
            defaults={
                "email": "drsmith@example.com",
                "first_name": "John",
                "last_name": "Smith",
            }
        )
        if created:
            doctor_user.set_password("Doctor123!")
            doctor_user.save()

        # 6. Create Staff Link (Physician)
        Staff.objects.get_or_create(
            user=doctor_user,
            facility=facility,
            defaults={
                "role": physician_role,
                "title": md_title
            }
        )

        self.stdout.write(self.style.SUCCESS("Successfully seeded Demo Clinic data"))