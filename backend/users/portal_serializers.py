from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from patients.models import Patient
from shared.serializers import AddressSerializer


class PortalEmergencyContactSerializer(serializers.Serializer):
    """Read-only emergency contact snippet for the patient portal."""

    name = serializers.CharField(read_only=True)
    relationship = serializers.CharField(read_only=True)
    phone_number = serializers.CharField(read_only=True)


class PortalPatientSerializer(serializers.ModelSerializer):
    """Patient profile shown in the patient portal.

    Intentionally narrow: exposes self-relevant demographics, contact info,
    preferred pharmacy, and facility context. Excludes clinician/staff PHI
    such as SSN, chart number, audit identifiers, and any ``*_by_name``
    clinician fields.
    """

    address = AddressSerializer(read_only=True)
    primary_phone_number = serializers.SerializerMethodField()
    primary_emergency_contact = serializers.SerializerMethodField()
    preferred_pharmacy_name = serializers.SerializerMethodField()
    facility_name = serializers.CharField(source="facility.name", read_only=True)
    facility_timezone = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            "id",
            "first_name",
            "last_name",
            "preferred_name",
            "date_of_birth",
            "sex_at_birth",
            "race",
            "ethnicity",
            "preferred_language",
            "pronouns",
            "email",
            "primary_phone_number",
            "address",
            "primary_emergency_contact",
            "preferred_pharmacy_name",
            "facility_name",
            "facility_timezone",
        ]
        read_only_fields = fields

    @extend_schema_field(serializers.CharField())
    def get_primary_phone_number(self, obj):
        primary_phone = next(
            (phone for phone in obj.phones.all() if phone.is_primary),
            None,
        )
        if primary_phone:
            return primary_phone.number
        first_phone = obj.phones.first()
        return first_phone.number if first_phone else ""

    @extend_schema_field(PortalEmergencyContactSerializer(allow_null=True))
    def get_primary_emergency_contact(self, obj):
        contact = next(
            (contact for contact in obj.emergency_contacts.all() if contact.is_primary),
            None,
        )
        if contact is None:
            contact = obj.emergency_contacts.first()
        if contact is None:
            return None
        return PortalEmergencyContactSerializer(contact).data

    @extend_schema_field(serializers.CharField())
    def get_preferred_pharmacy_name(self, obj):
        if obj.preferred_pharmacy_id and obj.preferred_pharmacy:
            return obj.preferred_pharmacy.name
        return ""

    @extend_schema_field(serializers.CharField())
    def get_facility_timezone(self, obj):
        # ``Facility.timezone`` is a ``TimeZoneField``; coerce to its IANA name.
        tz = getattr(obj.facility, "timezone", None)
        return str(tz) if tz else ""
