from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("appointments", "0004_appointment_internal_notes_and_more"),
    ]

    operations = [
        migrations.RenameField(
            model_name="appointment",
            old_name="internal_notes",
            new_name="notes",
        ),
        migrations.RemoveField(
            model_name="appointment",
            name="patient_instructions",
        ),
    ]
