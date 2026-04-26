from django.contrib.auth import get_user_model
from rest_framework import serializers

from patients.models import Pharmacy
from patients.serializers import PharmacySerializer
from shared.serializers import AddressSerializer

from .models import (
    Organization,
    OrganizationMembership,
    OrganizationPharmacyPreference,
)

User = get_user_model()


class OrganizationMembershipSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)

    class Meta:
        model = OrganizationMembership
        fields = [
            "id",
            "user_id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "created_at",
        ]


class OrganizationAddressMixin:
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


class OrganizationSerializer(OrganizationAddressMixin, serializers.ModelSerializer):
    address = AddressSerializer(required=False, allow_null=True)

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "slug",
            "legal_name",
            "phone_number",
            "email",
            "website",
            "tax_id",
            "address",
            "notes",
            "created_at",
            "updated_at",
        ]

    def create(self, validated_data):
        address_data = validated_data.pop("address", serializers.empty)
        organization = Organization(**validated_data)

        if address_data is not serializers.empty:
            self._save_address(organization, {"address": address_data})

        organization.save()
        return organization

    def update(self, instance, validated_data):
        self._save_address(instance, validated_data)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance


class OrganizationDetailSerializer(
    OrganizationAddressMixin, serializers.ModelSerializer
):
    address = AddressSerializer(required=False, allow_null=True)
    members = serializers.SerializerMethodField()
    active_people_count = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "slug",
            "legal_name",
            "phone_number",
            "email",
            "website",
            "tax_id",
            "address",
            "notes",
            "created_at",
            "updated_at",
            "active_people_count",
            "members",
        ]

    def get_members(self, obj):
        memberships = obj.memberships.filter(is_active=True).select_related("user")
        return OrganizationMembershipSerializer(memberships, many=True).data

    def get_active_people_count(self, obj):
        return obj.memberships.filter(is_active=True).count()


class OrganizationPersonSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username")
    email = serializers.EmailField(source="user.email")
    first_name = serializers.CharField(
        source="user.first_name", allow_blank=True, required=False
    )
    last_name = serializers.CharField(
        source="user.last_name", allow_blank=True, required=False
    )

    class Meta:
        model = OrganizationMembership
        fields = [
            "id",
            "user_id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "user_id", "created_at"]

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})

        user = instance.user
        for attr, value in user_data.items():
            setattr(user, attr, value)
        user.save()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        return instance


class OrganizationPersonCreateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150, allow_blank=True, required=False)
    last_name = serializers.CharField(max_length=150, allow_blank=True, required=False)
    role = serializers.ChoiceField(choices=OrganizationMembership.ROLE_CHOICES)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError(
                "A user with this username already exists."
            )
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        organization = self.context["organization"]

        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
        )

        membership = OrganizationMembership.objects.create(
            user=user,
            organization=organization,
            role=validated_data["role"],
            is_active=True,
        )
        return membership


class OrganizationPharmacyPreferenceSerializer(serializers.ModelSerializer):
    pharmacy = PharmacySerializer(read_only=True)

    class Meta:
        model = OrganizationPharmacyPreference
        fields = [
            "id",
            "pharmacy",
            "is_preferred",
            "is_hidden",
            "is_active",
            "notes",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "pharmacy"]


class OrganizationPharmacyPreferenceWriteSerializer(serializers.Serializer):
    pharmacy_id = serializers.PrimaryKeyRelatedField(
        queryset=Pharmacy.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )
    pharmacy = PharmacySerializer(required=False)
    is_preferred = serializers.BooleanField(required=False, default=True)
    is_hidden = serializers.BooleanField(required=False, default=False)
    is_active = serializers.BooleanField(required=False, default=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    sort_order = serializers.IntegerField(required=False, min_value=0, default=0)

    def validate(self, attrs):
        if (
            self.instance is None
            and not attrs.get("pharmacy_id")
            and not attrs.get("pharmacy")
        ):
            raise serializers.ValidationError(
                "Provide an existing pharmacy_id or pharmacy details."
            )
        pharmacy = attrs.get("pharmacy_id")
        organization = self.context["organization"]
        if (
            self.instance is None
            and pharmacy
            and pharmacy.source == Pharmacy.SOURCE_CUSTOM
            and not OrganizationPharmacyPreference.objects.filter(
                organization=organization,
                pharmacy=pharmacy,
            ).exists()
        ):
            raise serializers.ValidationError(
                {
                    "pharmacy_id": (
                        "Custom pharmacies must be created from details instead of "
                        "attached by global ID."
                    )
                }
            )
        return attrs

    def _clone_pharmacy_for_organization(self, pharmacy, pharmacy_data):
        address = None
        if pharmacy.address_id:
            address_model = pharmacy.address.__class__
            address = address_model.objects.create(
                line_1=pharmacy.address.line_1,
                line_2=pharmacy.address.line_2,
                city=pharmacy.address.city,
                state=pharmacy.address.state,
                zip_code=pharmacy.address.zip_code,
                country=pharmacy.address.country,
            )

        cloned = Pharmacy.objects.create(
            name=pharmacy.name,
            legal_business_name=pharmacy.legal_business_name,
            source=Pharmacy.SOURCE_CUSTOM,
            external_id="",
            ncpdp_id=None,
            npi=None,
            dea_number=pharmacy.dea_number,
            tax_id=pharmacy.tax_id,
            store_number=pharmacy.store_number,
            service_type=pharmacy.service_type,
            accepts_erx=pharmacy.accepts_erx,
            is_24_hour=pharmacy.is_24_hour,
            hours=pharmacy.hours,
            languages=pharmacy.languages,
            directory_source="",
            directory_status=Pharmacy.DIRECTORY_STATUS_UNKNOWN,
            phone_number=pharmacy.phone_number,
            fax_number=pharmacy.fax_number,
            address=address,
            notes=pharmacy.notes,
            is_active=pharmacy.is_active,
        )
        serializer = PharmacySerializer(cloned, data=pharmacy_data, partial=True)
        serializer.is_valid(raise_exception=True)
        return serializer.save()

    def create(self, validated_data):
        organization = self.context["organization"]
        pharmacy = validated_data.pop("pharmacy_id", None)
        pharmacy_data = validated_data.pop("pharmacy", None)

        if pharmacy is None and pharmacy_data:
            serializer = PharmacySerializer(data=pharmacy_data)
            serializer.is_valid(raise_exception=True)
            pharmacy = serializer.save()

        preference, _created = OrganizationPharmacyPreference.objects.update_or_create(
            organization=organization,
            pharmacy=pharmacy,
            defaults=validated_data,
        )
        return preference

    def update(self, instance, validated_data):
        validated_data.pop("pharmacy_id", None)
        pharmacy_data = validated_data.pop("pharmacy", None)

        if pharmacy_data:
            is_shared = (
                OrganizationPharmacyPreference.objects.filter(
                    pharmacy=instance.pharmacy,
                )
                .exclude(pk=instance.pk)
                .exists()
            )
            if instance.pharmacy.source != Pharmacy.SOURCE_CUSTOM or is_shared:
                instance.pharmacy = self._clone_pharmacy_for_organization(
                    instance.pharmacy,
                    pharmacy_data,
                )
            else:
                serializer = PharmacySerializer(
                    instance.pharmacy,
                    data=pharmacy_data,
                    partial=True,
                )
                serializer.is_valid(raise_exception=True)
                serializer.save()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
