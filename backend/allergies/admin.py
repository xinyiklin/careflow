from django.contrib import admin

from .models import PatientAllergy


@admin.register(PatientAllergy)
class PatientAllergyAdmin(admin.ModelAdmin):
    list_display = (
        "allergen",
        "patient",
        "category",
        "severity",
        "status",
        "facility",
        "updated_at",
    )
    list_filter = ("facility", "category", "severity", "status", "is_active")
    search_fields = (
        "allergen",
        "reaction",
        "patient__first_name",
        "patient__last_name",
        "patient__chart_number",
    )
    readonly_fields = ("is_active", "created_at", "updated_at")
    autocomplete_fields = ["patient", "facility", "created_by", "updated_by"]
