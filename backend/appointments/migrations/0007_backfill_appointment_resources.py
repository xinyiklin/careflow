from django.db import migrations


def is_physician_role(role):
    if not role:
        return False

    role_code = (getattr(role, "code", "") or "").strip().lower()
    role_name = (getattr(role, "name", "") or "").strip().lower()
    return role_code == "physician" or role_name == "physician"


def build_staff_resource_name(staff):
    full_name = " ".join(
        part for part in [staff.user.first_name, staff.user.last_name] if part
    ).strip()
    base_name = full_name or staff.user.username
    title_name = getattr(staff.title, "name", "") or ""
    return " ".join(part for part in [title_name, base_name] if part).strip()


def forwards(apps, schema_editor):
    Staff = apps.get_model("facilities", "Staff")
    FacilityResource = apps.get_model("facilities", "FacilityResource")

    for staff in (
        Staff.objects.select_related("user", "title", "role")
        .filter(is_active=True)
        .iterator()
    ):
        if not is_physician_role(staff.role):
            continue

        resource_name = build_staff_resource_name(staff)
        existing_resource = FacilityResource.objects.filter(
            linked_staff_id=staff.id
        ).first()

        if existing_resource:
            updated_fields = []

            if existing_resource.facility_id != staff.facility_id:
                existing_resource.facility_id = staff.facility_id
                updated_fields.append("facility")
            if not existing_resource.name:
                existing_resource.name = resource_name
                updated_fields.append("name")
            if not existing_resource.is_active:
                existing_resource.is_active = True
                updated_fields.append("is_active")
            if updated_fields:
                existing_resource.save(update_fields=updated_fields)
            continue

        FacilityResource.objects.create(
            facility_id=staff.facility_id,
            name=resource_name,
            linked_staff_id=staff.id,
            is_active=True,
            is_deletable=False,
        )


def backwards(apps, schema_editor):
    Appointment = apps.get_model("appointments", "Appointment")
    Appointment.objects.update(resource=None)


class Migration(migrations.Migration):
    dependencies = [
        ("appointments", "0006_appointment_resource_alter_appointment_doctor_name"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
