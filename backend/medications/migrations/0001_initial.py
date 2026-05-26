import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("facilities", "0013_clinical_permissions"),
        ("patients", "0015_document_category_system_defaults"),
    ]

    operations = [
        migrations.CreateModel(
            name="Medication",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("active", "Active"),
                            ("inactive", "Inactive"),
                            ("discontinued", "Discontinued"),
                        ],
                        default="active",
                        max_length=20,
                    ),
                ),
                ("medication_name", models.CharField(max_length=180)),
                ("dose", models.CharField(max_length=120)),
                ("route", models.CharField(max_length=80)),
                ("frequency", models.CharField(max_length=120)),
                ("start_date", models.DateField(blank=True, null=True)),
                ("end_date", models.DateField(blank=True, null=True)),
                ("prescriber_name", models.CharField(blank=True, max_length=150)),
                ("notes", models.TextField(blank=True)),
                ("created_by_name", models.CharField(blank=True, max_length=150)),
                ("updated_by_name", models.CharField(blank=True, max_length=150)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_medications",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "facility",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="medications",
                        to="facilities.facility",
                    ),
                ),
                (
                    "patient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="medications",
                        to="patients.patient",
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="updated_medications",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": [
                    "patient",
                    "medication_name",
                    "-start_date",
                    "-created_at",
                ],
            },
        ),
        migrations.AddIndex(
            model_name="medication",
            index=models.Index(
                fields=["facility", "patient", "status"],
                name="medications_facilit_bd30d7_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="medication",
            index=models.Index(
                fields=["facility", "status", "medication_name"],
                name="medications_facilit_c38a06_idx",
            ),
        ),
    ]
