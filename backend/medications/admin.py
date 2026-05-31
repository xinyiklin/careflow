from django.contrib import admin

from .models import Medication, PrescriberDelegation


@admin.register(Medication)
class MedicationAdmin(admin.ModelAdmin):
    list_display = (
        "medication_name",
        "patient",
        "facility",
        "status",
        "dose",
        "route",
        "frequency",
        "start_date",
        "end_date",
    )
    list_filter = ("facility", "status", "route")
    search_fields = (
        "medication_name",
        "patient__first_name",
        "patient__last_name",
        "prescriber_name",
    )
    readonly_fields = (
        "created_by_name",
        "updated_by_name",
        "created_at",
        "updated_at",
    )


@admin.register(PrescriberDelegation)
class PrescriberDelegationAdmin(admin.ModelAdmin):
    list_display = ("prescriber", "delegate", "facility", "is_active", "created_at")
    list_filter = ("facility", "is_active")
    search_fields = (
        "prescriber__first_name",
        "prescriber__last_name",
        "delegate__user__first_name",
        "delegate__user__last_name",
    )
    readonly_fields = ("created_at",)
