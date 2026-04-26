from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        "id",
        "username",
        "email",
        "first_name",
        "last_name",
        "is_staff",
        "is_active",
    )
    list_filter = (
        "is_staff",
        "is_superuser",
        "is_active",
    )
    search_fields = (
        "username",
        "email",
        "first_name",
        "last_name",
        "phone_number",
    )
    ordering = ("id",)

    fieldsets = BaseUserAdmin.fieldsets + (
        (
            "Additional Info",
            {"fields": ("phone_number",)},
        ),
    )

    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        (
            "Additional Info",
            {
                "fields": (
                    "email",
                    "first_name",
                    "last_name",
                    "phone_number",
                )
            },
        ),
    )
