from django.db import transaction
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from patients.models import Patient, PatientEmergencyContact, PatientPhone
from shared.serializers import AddressSerializer


class PortalEmergencyContactSerializer(serializers.Serializer):
    """Emergency contact snippet for the patient portal."""

    name = serializers.CharField(required=False, allow_blank=True)
    relationship = serializers.CharField(required=False, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)


class PortalPatientSerializer(serializers.ModelSerializer):
    """Patient profile shown in the patient portal.

    Exposes self-relevant demographics, contact info, and allows updates to
    preferred name, pronouns, preferred language, email, phone, address, and emergency contact.
    """

    address = AddressSerializer(required=False, allow_null=True)
    primary_phone_number = serializers.CharField(required=False, allow_blank=True)
    primary_emergency_contact = PortalEmergencyContactSerializer(
        required=False, allow_null=True
    )
    preferred_pharmacy_name = serializers.CharField(read_only=True, required=False)
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
            "insurance_policies",
        ]
        read_only_fields = [
            "id",
            "first_name",
            "last_name",
            "date_of_birth",
            "sex_at_birth",
            "race",
            "ethnicity",
            "preferred_pharmacy_name",
            "facility_name",
            "facility_timezone",
            "insurance_policies",
        ]

    def to_representation(self, instance):
        ret = super().to_representation(instance)

        # Populate primary_phone_number
        primary_phone = next(
            (phone for phone in instance.phones.all() if phone.is_primary),
            None,
        )
        if primary_phone:
            ret["primary_phone_number"] = primary_phone.number
        else:
            first_phone = instance.phones.first()
            ret["primary_phone_number"] = first_phone.number if first_phone else ""

        # Populate primary_emergency_contact
        contact = next(
            (
                contact
                for contact in instance.emergency_contacts.all()
                if contact.is_primary
            ),
            None,
        )
        if contact is None:
            contact = instance.emergency_contacts.first()

        if contact is not None:
            ret["primary_emergency_contact"] = PortalEmergencyContactSerializer(
                contact
            ).data
        else:
            ret["primary_emergency_contact"] = None

        # Populate preferred_pharmacy_name safely
        if instance.preferred_pharmacy_id and instance.preferred_pharmacy:
            ret["preferred_pharmacy_name"] = instance.preferred_pharmacy.name
        else:
            ret["preferred_pharmacy_name"] = ""

        # Populate insurance_policies safely
        from insurance.models import PatientInsurancePolicy

        policies = PatientInsurancePolicy.objects.filter(
            patient=instance, is_active=True
        ).order_by("coverage_order", "id")
        ret["insurance_policies"] = [
            {
                "id": policy.id,
                "carrier_name": policy.carrier.name if policy.carrier else "",
                "plan_name": policy.plan_name,
                "member_id": policy.member_id,
                "group_number": policy.group_number,
                "subscriber_name": policy.subscriber_name,
                "relationship_to_subscriber": policy.relationship_to_subscriber,
                "effective_date": policy.effective_date,
                "termination_date": policy.termination_date,
                "is_primary": policy.is_primary,
                "notes": policy.notes,
            }
            for policy in policies
        ]

        return ret

    def update(self, instance, validated_data):
        address_data = validated_data.pop("address", None)
        phone_number = validated_data.pop("primary_phone_number", None)
        emergency_data = validated_data.pop("primary_emergency_contact", None)

        with transaction.atomic():
            # Update base patient fields
            for attr, value in validated_data.items():
                setattr(instance, attr, value)

            # Update address
            if address_data is not None:
                if not address_data:
                    if instance.address_id:
                        instance.address.delete()
                    instance.address = None
                else:
                    if instance.address_id:
                        for attr, value in address_data.items():
                            setattr(instance.address, attr, value)
                        instance.address.save()
                    else:
                        from shared.models import Address

                        instance.address = Address.objects.create(**address_data)

            # Update phone number
            if phone_number is not None:
                phone_number = phone_number.strip()
                if phone_number:
                    primary_phone = instance.phones.filter(is_primary=True).first()
                    if primary_phone:
                        primary_phone.number = phone_number
                        primary_phone.save()
                    else:
                        first_phone = instance.phones.first()
                        if first_phone:
                            first_phone.number = phone_number
                            first_phone.is_primary = True
                            first_phone.save()
                        else:
                            PatientPhone.objects.create(
                                patient=instance,
                                number=phone_number,
                                label="cell",
                                is_primary=True,
                            )
                else:
                    instance.phones.all().delete()

            # Update emergency contact
            if emergency_data is not None:
                name = emergency_data.get("name", "").strip()
                relationship = emergency_data.get("relationship", "").strip()
                phone = emergency_data.get("phone_number", "").strip()

                if name:
                    primary_contact = instance.emergency_contacts.filter(
                        is_primary=True
                    ).first()
                    if primary_contact:
                        primary_contact.name = name
                        primary_contact.relationship = relationship
                        primary_contact.phone_number = phone
                        primary_contact.save()
                    else:
                        first_contact = instance.emergency_contacts.first()
                        if first_contact:
                            first_contact.name = name
                            first_contact.relationship = relationship
                            first_contact.phone_number = phone
                            first_contact.is_primary = True
                            first_contact.save()
                        else:
                            PatientEmergencyContact.objects.create(
                                patient=instance,
                                name=name,
                                relationship=relationship,
                                phone_number=phone,
                                is_primary=True,
                            )
                    # Sync to denormalized patient fields
                    instance.emergency_contact_name = name
                    instance.emergency_contact_relationship = relationship
                    instance.emergency_contact_phone = phone
                else:
                    instance.emergency_contacts.all().delete()
                    instance.emergency_contact_name = ""
                    instance.emergency_contact_relationship = ""
                    instance.emergency_contact_phone = ""

            instance.save()
        return instance

    @extend_schema_field(serializers.CharField())
    def get_facility_timezone(self, obj):
        # ``Facility.timezone`` is a ``TimeZoneField``; coerce to its IANA name.
        tz = getattr(obj.facility, "timezone", None)
        return str(tz) if tz else ""
