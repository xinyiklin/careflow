from django.contrib import admin
from .models import Appointment

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    # 1. Fields to show in the main list table
    list_display = (
        'patient_name', 
        'doctor_name', 
        'appointment_time', 
        'facility', 
        'status', 
        'appointment_type'
    )

    # 2. Sidebar filters for administrative efficiency
    list_filter = (
        'status', 
        'appointment_type', 
        'facility', 
        'appointment_time'
    )

    # 3. Search functionality for quick patient/doctor lookup
    search_fields = (
        'patient_name', 
        'doctor_name', 
        'reason'
    )

    # 4. Read-only fields to maintain audit integrity
    readonly_fields = ('created_at', 'created_by_name')

    # 5. Logical grouping of fields in the edit form
    fieldsets = (
        ('Primary Information', {
            'fields': (('patient_name', 'doctor_name'), 'facility')
        }),
        ('Schedule & Logistics', {
            'fields': ('appointment_time', 'appointment_type', 'status', 'reason')
        }),
        ('System Logs', {
            'classes': ('collapse',),  # Collapsed by default to save space
            'fields': ('created_by', 'created_by_name', 'created_at')
        }),
    )

    def save_model(self, request, obj, form, change):
        """
        Captures the logged-in user as the creator automatically 
        when an appointment is saved via the Admin dashboard.
        """
        if not obj.pk:  # Only set on initial creation
            obj.created_by = request.user
        super().save_model(request, obj, form, change)