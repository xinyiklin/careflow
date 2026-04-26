# Register your models here.
from django.contrib import admin

from .models import InsuranceCarrier, PatientInsurancePolicy


@admin.register(InsuranceCarrier)
class InsuranceCarrierAdmin(admin.ModelAdmin):
    list_display = ("name", "payer_id", "phone_number", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "payer_id", "phone_number")


@admin.register(PatientInsurancePolicy)
class PatientInsurancePolicyAdmin(admin.ModelAdmin):
    list_display = (
        "patient",
        "carrier",
        "member_id",
        "relationship_to_subscriber",
        "is_primary",
        "is_active",
    )
    list_filter = ("is_primary", "is_active", "relationship_to_subscriber")
    search_fields = (
        "patient__first_name",
        "patient__last_name",
        "carrier__name",
        "member_id",
        "group_number",
    )
