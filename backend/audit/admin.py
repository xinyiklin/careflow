# Register your models here.
from django.contrib import admin

from .models import AuditEvent


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "action",
        "summary",
        "actor",
        "facility",
        "patient",
    )
    list_filter = ("action", "app_label", "created_at")
    search_fields = (
        "summary",
        "actor__username",
        "actor__first_name",
        "actor__last_name",
        "patient__first_name",
        "patient__last_name",
        "object_pk",
    )
