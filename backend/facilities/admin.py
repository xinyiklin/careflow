from django.contrib import admin
from .models import Facility, Staff

class StaffInline(admin.TabularInline):
    model = Staff
    extra = 1 # Shows one empty row for quick adding

@admin.register(Facility)
class FacilityAdmin(admin.ModelAdmin):
    list_display = ('name', 'address', 'created_at')
    search_fields = ('name', 'address')
    inlines = [StaffInline] # Managed staff directly from the facility page

@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = ('user', 'facility', 'role', 'title')
    list_filter = ('role', 'facility')
    search_fields = ('user__username', 'user__email', 'title')