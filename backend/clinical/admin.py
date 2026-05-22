from django.contrib import admin

from .models import Encounter, ProgressNote


class ProgressNoteInline(admin.StackedInline):
    model = ProgressNote
    extra = 0
    readonly_fields = (
        "status",
        "signed_by_name",
        "signed_at",
        "created_at",
        "updated_at",
    )


@admin.register(Encounter)
class EncounterAdmin(admin.ModelAdmin):
    list_display = (
        "patient",
        "rendering_provider_name",
        "status",
        "started_at",
        "facility",
        "created_by_name",
    )
    list_filter = ("facility", "status", "started_at")
    search_fields = (
        "patient__first_name",
        "patient__last_name",
        "patient__chart_number",
        "reason",
        "rendering_provider_name",
    )
    readonly_fields = ("created_by_name", "created_at", "updated_at")
    autocomplete_fields = [
        "patient",
        "facility",
        "appointment",
        "rendering_provider",
        "created_by",
    ]
    inlines = [ProgressNoteInline]
