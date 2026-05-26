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

    def get_readonly_fields(self, request, obj=None):
        readonly_fields = list(super().get_readonly_fields(request, obj))
        if obj and obj.status == Encounter.STATUS_SIGNED:
            readonly_fields.extend(
                [
                    "subjective",
                    "objective",
                    "assessment",
                    "plan",
                    "created_by",
                    "signed_by",
                ]
            )
        return tuple(dict.fromkeys(readonly_fields))


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

    def get_readonly_fields(self, request, obj=None):
        readonly_fields = list(super().get_readonly_fields(request, obj))
        if obj and obj.status == Encounter.STATUS_SIGNED:
            readonly_fields.extend(
                [
                    "patient",
                    "facility",
                    "appointment",
                    "rendering_provider",
                    "status",
                    "reason",
                    "started_at",
                    "ended_at",
                    "created_by",
                ]
            )
        return tuple(dict.fromkeys(readonly_fields))
