from django.db import migrations


def migrate_links_forward(apps, schema_editor):
    OrganizationFeeSchedule = apps.get_model("billing", "OrganizationFeeSchedule")
    Staff = apps.get_model("facilities", "Staff")
    OrgPref = apps.get_model("insurance", "OrganizationInsuranceCarrierPreference")

    for schedule in OrganizationFeeSchedule.objects.exclude(assignment_type="same"):
        if schedule.assignment_type == "practitioner" and schedule.practitioner_id:
            Staff.objects.filter(pk=schedule.practitioner_id).update(
                fee_schedule=schedule
            )
        elif schedule.assignment_type == "payer" and schedule.payer_preference_id:
            OrgPref.objects.filter(pk=schedule.payer_preference_id).update(
                fee_schedule=schedule
            )


def migrate_links_reverse(apps, schema_editor):
    OrganizationFeeSchedule = apps.get_model("billing", "OrganizationFeeSchedule")
    Staff = apps.get_model("facilities", "Staff")
    OrgPref = apps.get_model("insurance", "OrganizationInsuranceCarrierPreference")

    for staff in Staff.objects.filter(fee_schedule__isnull=False).select_related(
        "fee_schedule"
    ):
        OrganizationFeeSchedule.objects.filter(pk=staff.fee_schedule_id).update(
            assignment_type="practitioner", practitioner=staff
        )

    for pref in OrgPref.objects.filter(fee_schedule__isnull=False).select_related(
        "fee_schedule"
    ):
        OrganizationFeeSchedule.objects.filter(pk=pref.fee_schedule_id).update(
            assignment_type="payer", payer_preference=pref
        )


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0003_organizationfeeschedule_and_more"),
        ("facilities", "0017_fee_schedule_redesign"),
        ("insurance", "0005_fee_schedule_redesign"),
    ]

    operations = [
        migrations.RunPython(migrate_links_forward, migrate_links_reverse),
    ]
