from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("appointments", "0008_appointment_rendering_provider"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="appointment",
            name="doctor_name",
        ),
    ]
