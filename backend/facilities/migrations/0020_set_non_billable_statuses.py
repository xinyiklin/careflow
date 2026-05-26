from django.db import migrations


def set_non_billable_statuses(apps, schema_editor):
    AppointmentStatus = apps.get_model("facilities", "AppointmentStatus")
    AppointmentStatus.objects.filter(code__in=["cancelled", "no_show"]).update(
        is_billable=False
    )


class Migration(migrations.Migration):

    dependencies = [
        ("facilities", "0019_appointmentstatus_is_billable_and_more"),
    ]

    operations = [
        migrations.RunPython(set_non_billable_statuses, migrations.RunPython.noop),
    ]
