from django.contrib import admin

from .models import (
    EncounterBillingRecord,
    EncounterChargeLine,
    EncounterDiagnosis,
)


class EncounterDiagnosisInline(admin.TabularInline):
    model = EncounterDiagnosis
    extra = 0


class EncounterChargeLineInline(admin.TabularInline):
    model = EncounterChargeLine
    extra = 0


@admin.register(EncounterBillingRecord)
class EncounterBillingRecordAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "encounter",
        "patient",
        "facility",
        "status",
        "payer_name",
        "updated_at",
    )
    list_filter = ("status", "facility")
    search_fields = (
        "patient__first_name",
        "patient__last_name",
        "patient__chart_number",
        "encounter__id",
        "payer_name",
    )
    readonly_fields = ("facility", "patient", "created_at", "updated_at")
    inlines = [EncounterDiagnosisInline, EncounterChargeLineInline]
