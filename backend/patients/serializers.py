from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from shared.serializers import AddressSerializer

from .models import (
    CareProvider,
    Patient,
    PatientDocument,
    PatientDocumentCategory,
    PatientEmergencyContact,
    PatientPharmacy,
    PatientPhone,
    Pharmacy,
    validate_phone_number,
)


class AddressModelSerializerMixin:
    def _save_address(self, instance, validated_data):
        address_data = validated_data.pop("address", serializers.empty)

        if address_data is serializers.empty:
            return

        if not address_data:
            if instance.address_id:
                instance.address.delete()
            instance.address = None
            return

        if instance.address_id:
            for attr, value in address_data.items():
                setattr(instance.address, attr, value)
            instance.address.save()
            return

        serializer = AddressSerializer(data=address_data)
        serializer.is_valid(raise_exception=True)
        instance.address = serializer.save()


class PatientDocumentSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source="name", read_only=True)
    category_name = serializers.SerializerMethodField()
    category_label = serializers.SerializerMethodField()
    date = serializers.DateField(source="document_date", read_only=True)
    uploaded_at = serializers.DateTimeField(source="created_at", read_only=True)
    size = serializers.CharField(source="file_size_display", read_only=True)

    class Meta:
        model = PatientDocument
        fields = [
            "id",
            "name",
            "title",
            "category",
            "category_name",
            "category_label",
            "date",
            "document_date",
            "uploaded_at",
            "uploaded_by_name",
            "size",
            "file_size_display",
            "file_size_bytes",
            "content_type",
            "original_filename",
            "notes",
        ]

    def get_category_label(self, obj):
        category = PatientDocumentCategory.objects.filter(
            facility_id=obj.patient.facility_id,
            code=obj.category,
        ).first()
        if category:
            return category.name

        return dict(PatientDocument.CATEGORY_CHOICES).get(obj.category, obj.category)

    def get_category_name(self, obj):
        return self.get_category_label(obj)


class PatientDocumentCategorySerializer(serializers.ModelSerializer):
    document_count = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    delete_block_reason = serializers.SerializerMethodField()

    class Meta:
        model = PatientDocumentCategory
        fields = [
            "id",
            "code",
            "name",
            "sort_order",
            "is_system",
            "is_active",
            "document_count",
            "can_delete",
            "delete_block_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "code",
            "is_system",
            "created_at",
            "updated_at",
        ]

    def get_document_count(self, obj):
        return PatientDocument.objects.filter(
            patient__facility_id=obj.facility_id,
            category=obj.code,
            is_active=True,
        ).count()

    def get_can_delete(self, obj):
        return self.get_delete_block_reason(obj) == ""

    def get_delete_block_reason(self, obj):
        if obj.is_system:
            return "System category"
        if self.get_document_count(obj) > 0:
            return "Documents filed"
        return ""


class PharmacySerializer(AddressModelSerializerMixin, serializers.ModelSerializer):
    address = AddressSerializer(required=False, allow_null=True)

    class Meta:
        model = Pharmacy
        fields = [
            "id",
            "name",
            "legal_business_name",
            "source",
            "external_id",
            "ncpdp_id",
            "npi",
            "dea_number",
            "tax_id",
            "store_number",
            "service_type",
            "accepts_erx",
            "is_24_hour",
            "hours",
            "languages",
            "directory_source",
            "directory_status",
            "last_directory_sync_at",
            "phone_number",
            "fax_number",
            "address",
            "notes",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate(self, attrs):
        for field in ["ncpdp_id", "npi"]:
            if attrs.get(field) == "":
                attrs[field] = None
        return attrs

    def create(self, validated_data):
        address_data = validated_data.pop("address", serializers.empty)
        pharmacy = Pharmacy(**validated_data)

        if address_data is not serializers.empty:
            self._save_address(pharmacy, {"address": address_data})

        pharmacy.save()
        return pharmacy

    def update(self, instance, validated_data):
        self._save_address(instance, validated_data)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance


class CareProviderSerializer(serializers.ModelSerializer):
    linked_staff_name = serializers.CharField(
        source="linked_staff.user.get_full_name",
        read_only=True,
    )
    display_name = serializers.CharField(read_only=True)

    class Meta:
        model = CareProvider
        fields = [
            "id",
            "facility",
            "linked_staff",
            "linked_staff_name",
            "display_name",
            "first_name",
            "last_name",
            "organization_name",
            "specialty",
            "phone_number",
            "fax_number",
            "npi",
            "address",
            "notes",
            "is_active",
            "created_at",
        ]
        read_only_fields = [
            "facility",
            "created_at",
            "display_name",
            "linked_staff_name",
        ]


class PatientPhoneSerializer(serializers.ModelSerializer):
    def validate_number(self, value):
        try:
            validate_phone_number(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message) from exc
        return value.strip()

    class Meta:
        model = PatientPhone
        fields = ["id", "number", "label", "is_primary"]
        read_only_fields = ["id"]


class PatientEmergencyContactSerializer(serializers.ModelSerializer):
    def validate_phone_number(self, value):
        try:
            validate_phone_number(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message) from exc
        return value.strip()

    class Meta:
        model = PatientEmergencyContact
        fields = [
            "id",
            "name",
            "relationship",
            "phone_number",
            "is_primary",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PatientPharmacySerializer(serializers.ModelSerializer):
    pharmacy_name = serializers.CharField(source="pharmacy.name", read_only=True)
    pharmacy = PharmacySerializer(read_only=True)

    class Meta:
        model = PatientPharmacy
        fields = [
            "id",
            "pharmacy",
            "pharmacy_name",
            "is_default",
            "is_active",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PatientSerializer(AddressModelSerializerMixin, serializers.ModelSerializer):
    address = AddressSerializer(required=False, allow_null=True)
    gender_name = serializers.CharField(source="gender.name", read_only=True)
    gender_code = serializers.CharField(source="gender.code", read_only=True)
    pcp_name = serializers.CharField(source="pcp.display_name", read_only=True)
    referring_provider_name = serializers.CharField(
        source="referring_provider.display_name",
        read_only=True,
    )
    preferred_pharmacy_name = serializers.CharField(
        source="preferred_pharmacy.name",
        read_only=True,
    )
    ssn = serializers.CharField(write_only=True, required=False, allow_blank=True)
    ssn_last4 = serializers.SerializerMethodField()
    primary_phone_number = serializers.SerializerMethodField()
    phones = PatientPhoneSerializer(many=True, required=False)
    emergency_contacts = PatientEmergencyContactSerializer(many=True, required=False)
    patient_documents = PatientDocumentSerializer(many=True, read_only=True)
    documents = PatientDocumentSerializer(
        source="patient_documents",
        many=True,
        read_only=True,
    )
    patient_pharmacies = PatientPharmacySerializer(
        source="pharmacy_preferences",
        many=True,
        read_only=True,
    )
    pharmacy_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
    )

    def get_primary_phone_number(self, obj):
        primary_phone = next(
            (phone for phone in obj.phones.all() if phone.is_primary), None
        )
        if primary_phone:
            return primary_phone.number
        return obj.phones.first().number if obj.phones.exists() else ""

    def get_ssn_last4(self, obj):
        if obj.ssn:
            return obj.ssn[-4:]
        return obj.ssn_last4 or ""

    def validate_ssn(self, value):
        digits = "".join(char for char in str(value or "") if char.isdigit())
        if not digits:
            return ""
        if len(digits) != 9:
            raise serializers.ValidationError("SSN must be exactly 9 digits.")
        return digits

    def validate_phones(self, value):
        cleaned_phones = [
            phone for phone in value if (phone.get("number") or "").strip()
        ]
        if not cleaned_phones:
            raise serializers.ValidationError("At least one phone number is required.")
        return cleaned_phones

    def validate(self, attrs):
        attrs = super().validate(attrs)
        phones = attrs.get("phones", serializers.empty)

        if self.instance is None:
            if phones is serializers.empty:
                raise serializers.ValidationError(
                    {"phones": "At least one phone number is required."}
                )
            return attrs

        if phones is not serializers.empty:
            if not phones:
                raise serializers.ValidationError(
                    {"phones": "At least one phone number is required."}
                )
            return attrs

        if self.partial:
            return attrs

        if not self.instance.phones.exists():
            raise serializers.ValidationError(
                {"phones": "At least one phone number is required."}
            )

        return attrs

    def _save_phones(self, patient, phones_data):
        patient.phones.all().delete()

        normalized_phones = [phone for phone in phones_data if phone.get("number")]
        if not normalized_phones:
            return

        primary_label = (
            "cell"
            if any(phone.get("label") == "cell" for phone in normalized_phones)
            else None
        )

        for index, phone in enumerate(normalized_phones):
            PatientPhone.objects.create(
                patient=patient,
                number=phone["number"].strip(),
                label=phone.get("label") or "cell",
                is_primary=(
                    phone.get("label") == primary_label if primary_label else index == 0
                ),
            )

    def _save_emergency_contacts(self, patient, contacts_data):
        patient.emergency_contacts.all().delete()

        normalized_contacts = [
            contact
            for contact in contacts_data
            if any(
                (contact.get(field) or "").strip()
                for field in ["name", "relationship", "phone_number", "notes"]
            )
        ]

        if not normalized_contacts:
            patient.emergency_contact_name = ""
            patient.emergency_contact_relationship = ""
            patient.emergency_contact_phone = ""
            patient.save(
                update_fields=[
                    "emergency_contact_name",
                    "emergency_contact_relationship",
                    "emergency_contact_phone",
                ]
            )
            return

        primary_index = next(
            (
                index
                for index, contact in enumerate(normalized_contacts)
                if contact.get("is_primary")
            ),
            0,
        )

        primary_contact = None
        for index, contact in enumerate(normalized_contacts):
            emergency_contact = PatientEmergencyContact.objects.create(
                patient=patient,
                name=(contact.get("name") or "").strip(),
                relationship=(contact.get("relationship") or "").strip(),
                phone_number=(contact.get("phone_number") or "").strip(),
                is_primary=index == primary_index,
                notes=(contact.get("notes") or "").strip(),
            )
            if index == primary_index:
                primary_contact = emergency_contact

        if primary_contact:
            Patient.objects.filter(pk=patient.pk).update(
                emergency_contact_name=primary_contact.name,
                emergency_contact_relationship=primary_contact.relationship,
                emergency_contact_phone=primary_contact.phone_number,
            )
            patient.emergency_contact_name = primary_contact.name
            patient.emergency_contact_relationship = primary_contact.relationship
            patient.emergency_contact_phone = primary_contact.phone_number

    def _sync_preferred_pharmacy(self, patient, pharmacy_ids=serializers.empty):
        if pharmacy_ids is serializers.empty:
            if patient.preferred_pharmacy_id:
                PatientPharmacy.objects.update_or_create(
                    patient=patient,
                    pharmacy=patient.preferred_pharmacy,
                    defaults={
                        "is_default": True,
                        "is_active": True,
                    },
                )
                return

            PatientPharmacy.objects.filter(patient=patient, is_default=True).update(
                is_default=False
            )
            return

        normalized_pharmacy_ids = {
            int(pharmacy_id) for pharmacy_id in pharmacy_ids if pharmacy_id
        }
        if patient.preferred_pharmacy_id:
            normalized_pharmacy_ids.add(patient.preferred_pharmacy_id)

        PatientPharmacy.objects.filter(patient=patient).exclude(
            pharmacy_id__in=normalized_pharmacy_ids
        ).delete()

        PatientPharmacy.objects.filter(patient=patient).update(is_default=False)

        for pharmacy_id in normalized_pharmacy_ids:
            PatientPharmacy.objects.update_or_create(
                patient=patient,
                pharmacy_id=pharmacy_id,
                defaults={
                    "is_default": pharmacy_id == patient.preferred_pharmacy_id,
                    "is_active": True,
                },
            )

        if not patient.preferred_pharmacy_id and normalized_pharmacy_ids:
            fallback = PatientPharmacy.objects.filter(patient=patient).first()
            if fallback:
                fallback.is_default = True
                fallback.save(update_fields=["is_default", "updated_at"])
                patient.preferred_pharmacy = fallback.pharmacy
                patient.save(update_fields=["preferred_pharmacy"])

    def create(self, validated_data):
        phones_data = validated_data.pop("phones", [])
        emergency_contacts_data = validated_data.pop(
            "emergency_contacts", serializers.empty
        )
        pharmacy_ids = validated_data.pop("pharmacy_ids", serializers.empty)
        address_data = validated_data.pop("address", serializers.empty)
        patient = Patient(**validated_data)

        if address_data is not serializers.empty:
            self._save_address(patient, {"address": address_data})

        patient.save()
        self._save_phones(patient, phones_data)
        if emergency_contacts_data is not serializers.empty:
            self._save_emergency_contacts(patient, emergency_contacts_data)
        self._sync_preferred_pharmacy(patient, pharmacy_ids)
        return patient

    def update(self, instance, validated_data):
        phones_data = validated_data.pop("phones", serializers.empty)
        emergency_contacts_data = validated_data.pop(
            "emergency_contacts", serializers.empty
        )
        pharmacy_ids = validated_data.pop("pharmacy_ids", serializers.empty)
        self._save_address(instance, validated_data)

        if "ssn" in validated_data:
            instance.ssn_last4 = (
                validated_data["ssn"][-4:] if validated_data["ssn"] else ""
            )

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if phones_data is not serializers.empty:
            self._save_phones(instance, phones_data)

        if emergency_contacts_data is not serializers.empty:
            self._save_emergency_contacts(instance, emergency_contacts_data)

        if (
            "preferred_pharmacy" in validated_data
            or pharmacy_ids is not serializers.empty
        ):
            self._sync_preferred_pharmacy(instance, pharmacy_ids)

        return instance

    class Meta:
        model = Patient
        fields = [
            "id",
            "facility",
            "preferred_name",
            "middle_name",
            "last_name",
            "first_name",
            "date_of_birth",
            "gender",
            "gender_name",
            "gender_code",
            "sex_at_birth",
            "race",
            "race_declined",
            "ethnicity",
            "ethnicity_declined",
            "preferred_language",
            "preferred_language_declined",
            "pronouns",
            "email",
            "address",
            "emergency_contact_name",
            "emergency_contact_relationship",
            "emergency_contact_phone",
            "emergency_contacts",
            "patient_documents",
            "documents",
            "ssn",
            "ssn_last4",
            "chart_number",
            "primary_phone_number",
            "phones",
            "pcp",
            "pcp_name",
            "referring_provider",
            "referring_provider_name",
            "preferred_pharmacy",
            "preferred_pharmacy_name",
            "patient_pharmacies",
            "pharmacy_ids",
            "is_active",
        ]
        read_only_fields = ["facility", "chart_number"]
