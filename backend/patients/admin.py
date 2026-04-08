from django.contrib import admin
from .models import Patient

@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('last_name', 'first_name', 'facility', 'date_of_birth', 'gender', 'is_active')
    list_filter = ('facility', 'gender', 'is_active', 'created_at')
    search_fields = ('last_name', 'first_name', 'chart_number')
    
    # This adds a nice navigation bar for dates at the top
    date_hierarchy = 'created_at'
    
    # Grouping fields for a cleaner edit screen
    fieldsets = (
        ('Basic Info', {
            'fields': (('first_name', 'last_name'), 'date_of_birth', 'gender')
        }),
        ('Clinic Data', {
            'fields': ('facility', 'chart_number', 'is_active')
        }),
    )