from django.contrib import admin
from .models import Facility, Staff, StaffRole, StaffTitle, AppointmentStatus, AppointmentType


class StaffInline(admin.TabularInline):
    model = Staff
    extra = 1


@admin.register(Facility)
class FacilityAdmin(admin.ModelAdmin):
    list_display = ("name", "address", "created_at")
    search_fields = ("name", "address")
    inlines = [StaffInline]


@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = ("user", "facility", "role", "title", "is_active")
    list_filter = ("facility", "role", "is_active")
    search_fields = (
        "user__username",
        "user__email",
        "user__first_name",
        "user__last_name",
        "role__name",
        "title__name",
    )


@admin.register(StaffRole)
class StaffRoleAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "facility", "is_system_role", "is_active")
    list_filter = ("facility", "is_system_role", "is_active")
    search_fields = ("name", "code")


@admin.register(StaffTitle)
class StaffTitleAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "facility", "is_active")
    list_filter = ("facility", "is_active")
    search_fields = ("name", "code")


@admin.register(AppointmentStatus)
class AppointmentStatusAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "facility", "color", "is_active")
    list_filter = ("facility", "is_active")
    search_fields = ("name", "code")


@admin.register(AppointmentType)
class AppointmentTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "facility", "color", "is_active")
    list_filter = ("facility", "is_active")
    search_fields = ("name", "code")