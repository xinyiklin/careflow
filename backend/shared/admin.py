from django.contrib import admin

from .models import Address


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ("id", "line_1", "line_2", "city", "state", "zip_code")
    search_fields = ("line_1", "line_2", "city", "state", "zip_code")
    ordering = ("id",)
