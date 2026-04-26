import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("facilities", "0007_staff_security_permissions"),
        ("appointments", "0007_backfill_appointment_resources"),
    ]

    operations = [
        migrations.AddField(
            model_name="appointment",
            name="rendering_provider",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="rendered_appointments",
                to="facilities.staff",
            ),
        ),
        migrations.AddField(
            model_name="appointment",
            name="rendering_provider_name",
            field=models.CharField(blank=True, max_length=150),
        ),
    ]
