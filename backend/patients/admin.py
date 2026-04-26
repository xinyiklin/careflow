from django.contrib import admin

from .models import (
    CareProvider,
    Patient,
    PatientDocument,
    PatientDocumentCategory,
    PatientEmergencyContact,
    PatientPharmacy,
    PatientPhone,
    Pharmacy,
)


class PatientPhoneInline(admin.TabularInline):
    model = PatientPhone
    extra = 0


class PatientPharmacyInline(admin.TabularInline):
    model = PatientPharmacy
    extra = 0
    autocomplete_fields = ["pharmacy"]


class PatientEmergencyContactInline(admin.TabularInline):
    model = PatientEmergencyContact
    extra = 0


class PatientDocumentInline(admin.TabularInline):
    model = PatientDocument
    extra = 0
    fields = (
        "name",
        "category",
        "document_date",
        "uploaded_by_name",
        "file_size_display",
        "file_url",
        "is_active",
    )


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = (
        "last_name",
        "first_name",
        "preferred_name",
        "date_of_birth",
        "chart_number",
        "emergency_contact_name",
        "gender",
        "pcp",
        "preferred_pharmacy",
        "facility",
        "is_active",
    )
    list_filter = (
        "facility",
        "gender",
        "sex_at_birth",
        "race",
        "ethnicity",
        "is_active",
        "created_at",
    )
    search_fields = (
        "last_name",
        "first_name",
        "preferred_name",
        "chart_number",
        "email",
        "ssn",
        "ssn_last4",
    )
    date_hierarchy = "created_at"
    inlines = [
        PatientPhoneInline,
        PatientEmergencyContactInline,
        PatientPharmacyInline,
        PatientDocumentInline,
    ]

    fieldsets = (
        (
            "Basic Info",
            {
                "fields": (
                    ("first_name", "last_name"),
                    ("middle_name", "preferred_name"),
                    "date_of_birth",
                    "gender",
                    "sex_at_birth",
                    ("race", "race_declined"),
                    ("ethnicity", "ethnicity_declined"),
                    ("preferred_language", "preferred_language_declined"),
                    "pronouns",
                )
            },
        ),
        (
            "Contact",
            {
                "fields": (
                    "email",
                    (
                        "emergency_contact_name",
                        "emergency_contact_relationship",
                    ),
                    "emergency_contact_phone",
                    "address",
                ),
            },
        ),
        (
            "Facility",
            {
                "fields": (
                    "facility",
                    "chart_number",
                    "is_active",
                )
            },
        ),
        (
            "Care Team",
            {
                "fields": (
                    "pcp",
                    "referring_provider",
                    "preferred_pharmacy",
                ),
            },
        ),
        (
            "Identifiers",
            {
                "fields": ("ssn", "ssn_last4"),
                "description": "SSN is masked in the clinical UI by default. Last 4 is derived when full SSN is present.",
            },
        ),
    )


@admin.register(PatientPhone)
class PatientPhoneAdmin(admin.ModelAdmin):
    list_display = ("patient", "label", "number", "is_primary")
    list_filter = ("label", "is_primary")
    search_fields = (
        "patient__first_name",
        "patient__last_name",
        "number",
    )


@admin.register(PatientDocument)
class PatientDocumentAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "patient",
        "category",
        "document_date",
        "uploaded_by_name",
        "is_active",
    )
    list_filter = ("category", "is_active", "document_date", "created_at")
    search_fields = (
        "name",
        "patient__first_name",
        "patient__last_name",
        "patient__chart_number",
        "uploaded_by_name",
    )
    autocomplete_fields = ["patient"]


@admin.register(PatientDocumentCategory)
class PatientDocumentCategoryAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "code",
        "facility",
        "sort_order",
        "is_system",
        "is_active",
    )
    list_filter = ("facility", "is_system", "is_active")
    search_fields = ("name", "code", "facility__name")


@admin.register(PatientEmergencyContact)
class PatientEmergencyContactAdmin(admin.ModelAdmin):
    list_display = ("patient", "name", "relationship", "phone_number", "is_primary")
    list_filter = ("is_primary",)
    search_fields = (
        "patient__first_name",
        "patient__last_name",
        "name",
        "phone_number",
    )


@admin.register(Pharmacy)
class PharmacyAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "ncpdp_id",
        "npi",
        "service_type",
        "accepts_erx",
        "is_active",
    )
    list_filter = (
        "source",
        "service_type",
        "accepts_erx",
        "directory_status",
        "is_active",
    )
    search_fields = (
        "name",
        "legal_business_name",
        "phone_number",
        "fax_number",
        "external_id",
        "ncpdp_id",
        "npi",
        "dea_number",
        "store_number",
    )


@admin.register(PatientPharmacy)
class PatientPharmacyAdmin(admin.ModelAdmin):
    list_display = ("patient", "pharmacy", "is_default", "is_active", "created_at")
    list_filter = ("is_default", "is_active")
    search_fields = ("patient__first_name", "patient__last_name", "pharmacy__name")
    autocomplete_fields = ["patient", "pharmacy"]


@admin.register(CareProvider)
class CareProviderAdmin(admin.ModelAdmin):
    list_display = (
        "display_name",
        "facility",
        "specialty",
        "organization_name",
        "is_active",
    )
    list_filter = ("facility", "is_active")
    search_fields = (
        "first_name",
        "last_name",
        "organization_name",
        "specialty",
        "npi",
    )
