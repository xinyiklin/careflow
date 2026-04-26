from django.contrib import admin

from facilities.models import Facility

from .models import (
    Organization,
    OrganizationMembership,
    OrganizationPharmacyPreference,
)


class OrganizationMembershipInline(admin.TabularInline):
    model = OrganizationMembership
    extra = 0
    autocomplete_fields = ["user"]


class FacilityInline(admin.TabularInline):
    model = Facility
    extra = 0
    fields = ("name", "facility_code", "phone_number", "timezone", "is_active")
    show_change_link = True


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug", "phone_number", "email", "created_at")
    search_fields = ("name", "slug", "legal_name", "phone_number", "email", "tax_id")
    ordering = ("id",)
    inlines = [OrganizationMembershipInline, FacilityInline]
    fieldsets = (
        ("Identity", {"fields": ("name", "legal_name", "slug")}),
        ("Contact", {"fields": ("phone_number", "email", "website", "address")}),
        ("Business", {"fields": ("tax_id", "notes")}),
    )


@admin.register(OrganizationMembership)
class OrganizationMembershipAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "organization", "role", "is_active", "created_at")
    list_filter = ("role", "is_active", "organization")
    search_fields = (
        "user__username",
        "user__email",
        "organization__name",
    )
    autocomplete_fields = ["user", "organization"]
    ordering = ("id",)


@admin.register(OrganizationPharmacyPreference)
class OrganizationPharmacyPreferenceAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "organization",
        "pharmacy",
        "is_preferred",
        "is_hidden",
        "is_active",
        "sort_order",
    )
    list_filter = ("organization", "is_preferred", "is_hidden", "is_active")
    search_fields = ("organization__name", "pharmacy__name", "pharmacy__phone_number")
    autocomplete_fields = ["organization", "pharmacy"]
    ordering = ("organization__name", "sort_order", "pharmacy__name")
