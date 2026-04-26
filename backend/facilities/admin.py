from django.contrib import admin

from .models import (
    AppointmentStatus,
    AppointmentType,
    Facility,
    PatientGender,
    Staff,
    StaffRole,
    StaffTitle,
)


class StaffRoleInline(admin.TabularInline):
    model = StaffRole
    extra = 0


class StaffTitleInline(admin.TabularInline):
    model = StaffTitle
    extra = 0


class AppointmentStatusInline(admin.TabularInline):
    model = AppointmentStatus
    extra = 0


class AppointmentTypeInline(admin.TabularInline):
    model = AppointmentType
    extra = 0


class PatientGenderInline(admin.TabularInline):
    model = PatientGender
    extra = 0


@admin.register(Facility)
class FacilityAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "facility_code",
        "organization",
        "phone_number",
        "timezone",
        "created_at",
    )
    list_filter = ("organization",)
    search_fields = (
        "name",
        "facility_code",
        "organization__name",
        "phone_number",
        "email",
    )
    ordering = ("id",)
    fieldsets = (
        (
            "Identity",
            {"fields": ("organization", "name", "facility_code", "is_active")},
        ),
        ("Contact", {"fields": ("phone_number", "fax_number", "email", "address")}),
        ("Operations", {"fields": ("timezone", "notes")}),
    )
    inlines = [
        StaffRoleInline,
        StaffTitleInline,
        AppointmentStatusInline,
        AppointmentTypeInline,
        PatientGenderInline,
    ]


@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "facility",
        "role",
        "title",
        "is_active",
        "is_default",
    )
    list_filter = ("facility", "role", "is_active", "is_default")
    search_fields = (
        "user__username",
        "user__first_name",
        "user__last_name",
        "facility__name",
    )
    autocomplete_fields = ["user", "facility", "role", "title"]
    ordering = ("id",)


@admin.register(StaffRole)
class StaffRoleAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "code",
        "facility",
        "is_system_role",
        "is_deletable",
        "is_active",
    )
    list_filter = ("facility", "is_system_role", "is_deletable", "is_active")
    search_fields = ("name", "code")


@admin.register(StaffTitle)
class StaffTitleAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "code", "facility", "is_deletable", "is_active")
    list_filter = ("facility", "is_deletable", "is_active")
    search_fields = ("name", "code")


@admin.register(AppointmentStatus)
class AppointmentStatusAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "code",
        "facility",
        "color",
        "is_deletable",
        "is_active",
    )
    list_filter = ("facility", "is_deletable", "is_active")
    search_fields = ("name", "code")


@admin.register(AppointmentType)
class AppointmentTypeAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "code",
        "facility",
        "duration_minutes",
        "color",
        "is_deletable",
        "is_active",
    )
    list_filter = ("facility", "is_deletable", "is_active")
    search_fields = ("name", "code")


@admin.register(PatientGender)
class PatientGenderAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "code",
        "facility",
        "sort_order",
        "is_deletable",
        "is_active",
    )
    list_filter = ("facility", "is_deletable", "is_active")
    search_fields = ("name", "code")
    ordering = ("facility", "sort_order", "name")
