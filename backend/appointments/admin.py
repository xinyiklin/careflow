from django.contrib import admin

from .models import Appointment


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = (
        "patient_display",
        "rendering_provider_name",
        "appointment_time",
        "room",
        "facility",
        "status",
        "appointment_type",
        "created_by_name",
    )
    list_filter = (
        "facility",
        "status",
        "appointment_type",
        "appointment_time",
    )
    search_fields = (
        "patient__first_name",
        "patient__last_name",
        "rendering_provider_name",
        "reason",
        "room",
        "notes",
    )
    readonly_fields = ("created_at", "created_by_name", "rendering_provider_name")

    fieldsets = (
        (
            "Primary Information",
            {
                "fields": (
                    "patient",
                    ("rendering_provider", "rendering_provider_name"),
                    "facility",
                )
            },
        ),
        (
            "Schedule & Logistics",
            {
                "fields": (
                    "appointment_time",
                    "appointment_type",
                    "status",
                    "room",
                    "reason",
                )
            },
        ),
        (
            "Notes",
            {"fields": ("notes",)},
        ),
        (
            "System Logs",
            {
                "classes": ("collapse",),
                "fields": ("created_by", "created_by_name", "created_at"),
            },
        ),
    )

    autocomplete_fields = [
        "patient",
        "facility",
        "status",
        "appointment_type",
        "rendering_provider",
        "created_by",
    ]

    def patient_display(self, obj):
        return f"{obj.patient.last_name}, {obj.patient.first_name}"

    patient_display.short_description = "Patient"

    def save_model(self, request, obj, form, change):
        if not obj.pk and request.user.is_authenticated:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
