from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from patients.models import Pharmacy
from patients.serializers import PharmacySerializer
from shared.serializers import AddressSerializer

from .models import (
    FacilityPharmacyPreferenceOverride,
    Organization,
    OrganizationMembership,
    OrganizationPharmacyPreference,
    OrganizationRole,
)
from .security import normalize_org_security_permissions

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
            "security_permissions",
            "is_active",
            "created_at",
        ]


class OrganizationRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationRole
        fields = [
            "id",
            "code",
            "name",
            "description",
            "security_permissions",
            "is_system_role",
            "is_deletable",
            "is_active",
        ]
        read_only_fields = ["id", "is_system_role", "is_deletable"]


class OrganizationSecuritySerializer(serializers.Serializer):
    role = serializers.CharField(max_length=50)
    security_permissions = serializers.DictField(child=serializers.BooleanField())

    def validate_security_permissions(self, value):
        return normalize_org_security_permissions(value)


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
    facility_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False
    )
    admin_facility_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False
    )
    facility_names = serializers.SerializerMethodField()
    admin_facility_names = serializers.SerializerMethodField()

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
            "facility_ids",
            "admin_facility_ids",
            "facility_names",
            "admin_facility_names",
            "created_at",
        ]
        read_only_fields = ["id", "user_id", "created_at"]

    def _get_active_staff_profiles(self, obj):
        cache = getattr(self, "_staff_profile_cache", None)
        if cache is None:
            cache = {}
            self._staff_profile_cache = cache
        if obj.pk in cache:
            return cache[obj.pk]

        profiles = getattr(obj.user, "staff_profiles", None)
        if profiles is None:
            return []
        cache[obj.pk] = list(
            profiles.filter(
                facility__organization=obj.organization,
                is_active=True,
            )
            .select_related("facility", "role")
            .order_by("facility__name")
        )
        return cache[obj.pk]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        profiles = self._get_active_staff_profiles(instance)
        ret["facility_ids"] = [p.facility_id for p in profiles]
        ret["admin_facility_ids"] = [
            p.facility_id
            for p in profiles
            if p.facility and p.role and p.role.code == "admin"
        ]
        return ret

    def get_facility_names(self, obj):
        return [
            profile.facility.name
            for profile in self._get_active_staff_profiles(obj)
            if profile.facility
        ]

    def get_admin_facility_names(self, obj):
        return [
            profile.facility.name
            for profile in self._get_active_staff_profiles(obj)
            if profile.facility and profile.role and profile.role.code == "admin"
        ]

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        facility_ids = validated_data.pop("facility_ids", None)
        admin_facility_ids = validated_data.pop("admin_facility_ids", None)

        user = instance.user
        for attr, value in user_data.items():
            setattr(user, attr, value)
        user.save()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if facility_ids is not None:
            from facilities.models import Facility, Staff, StaffRole

            org_facilities = Facility.objects.filter(organization=instance.organization)
            org_facility_ids = set(org_facilities.values_list("id", flat=True))

            target_facility_ids = set(facility_ids) & org_facility_ids
            target_admin_ids = set(admin_facility_ids or []) & target_facility_ids

            with transaction.atomic():
                Staff.objects.filter(
                    user=user, facility__organization=instance.organization
                ).exclude(facility_id__in=target_facility_ids).update(is_active=False)

                for fac in org_facilities:
                    if fac.id in target_facility_ids:
                        staff, created = Staff.objects.get_or_create(
                            user=user,
                            facility=fac,
                            defaults={
                                "role": StaffRole.objects.filter(
                                    facility=fac, code="front_desk"
                                ).first()
                                or StaffRole.objects.filter(facility=fac).first(),
                                "is_active": True,
                            },
                        )
                        if not created:
                            staff.is_active = True

                        is_admin = fac.id in target_admin_ids
                        current_role_code = staff.role.code if staff.role else ""

                        if is_admin and current_role_code != "admin":
                            admin_role = StaffRole.objects.filter(
                                facility=fac, code="admin"
                            ).first()
                            if admin_role:
                                staff.role = admin_role
                        elif not is_admin and current_role_code == "admin":
                            non_admin_role = (
                                StaffRole.objects.filter(facility=fac)
                                .exclude(code="admin")
                                .first()
                            )
                            if non_admin_role:
                                staff.role = non_admin_role

                        staff.save()

        return instance


class OrganizationPersonCreateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150, allow_blank=True, required=False)
    last_name = serializers.CharField(max_length=150, allow_blank=True, required=False)
    role = serializers.CharField(max_length=50)
    facility_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=list
    )
    admin_facility_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=list
    )

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
        facility_ids = validated_data.pop("facility_ids", [])
        admin_facility_ids = validated_data.pop("admin_facility_ids", [])

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

        from facilities.models import Facility, Staff, StaffRole

        org_facilities = Facility.objects.filter(organization=organization)
        org_facility_ids = set(org_facilities.values_list("id", flat=True))

        target_facility_ids = set(facility_ids) & org_facility_ids
        target_admin_ids = set(admin_facility_ids) & target_facility_ids

        with transaction.atomic():
            for fac in org_facilities:
                if fac.id in target_facility_ids:
                    is_admin = fac.id in target_admin_ids
                    if is_admin:
                        role = StaffRole.objects.filter(
                            facility=fac, code="admin"
                        ).first()
                    else:
                        role = (
                            StaffRole.objects.filter(
                                facility=fac, code="front_desk"
                            ).first()
                            or StaffRole.objects.filter(facility=fac).first()
                        )

                    Staff.objects.create(
                        user=user, facility=fac, role=role, is_active=True
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


class FacilityPharmacyPreferenceOverrideSerializer(serializers.ModelSerializer):
    pharmacy = PharmacySerializer(read_only=True)
    pharmacy_id = serializers.PrimaryKeyRelatedField(
        queryset=Pharmacy.objects.all(),
        source="pharmacy",
        required=False,
        allow_null=True,
        write_only=True,
    )
    pharmacy_details = PharmacySerializer(required=False, write_only=True)
    effective_pharmacy = PharmacySerializer(read_only=True)

    class Meta:
        model = FacilityPharmacyPreferenceOverride
        fields = [
            "id",
            "facility",
            "organization_preference",
            "pharmacy",
            "pharmacy_id",
            "pharmacy_details",
            "is_preferred",
            "is_hidden",
            "is_active",
            "notes",
            "sort_order",
            "effective_pharmacy",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "facility",
            "pharmacy",
            "effective_pharmacy",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "organization_preference": {"required": False, "allow_null": True},
            "is_preferred": {"required": False},
            "is_hidden": {"required": False},
            "is_active": {"required": False},
            "notes": {"required": False, "allow_blank": True},
            "sort_order": {"required": False},
        }

    def validate_organization_preference(self, value):
        facility = self.context.get("facility")
        if value and facility and value.organization_id != facility.organization_id:
            raise serializers.ValidationError(
                "Selected pharmacy does not belong to this organization."
            )
        return value

    def validate(self, attrs):
        pharmacy_details = attrs.get("pharmacy_details")
        has_org_preference = bool(attrs.get("organization_preference"))
        has_local_pharmacy = bool(attrs.get("pharmacy") or pharmacy_details)

        if self.instance:
            has_org_preference = bool(
                attrs.get(
                    "organization_preference", self.instance.organization_preference
                )
            )
            has_local_pharmacy = bool(
                attrs.get("pharmacy", self.instance.pharmacy) or pharmacy_details
            )

        if has_org_preference == has_local_pharmacy:
            raise serializers.ValidationError(
                "Provide either an organization pharmacy or a local pharmacy."
            )
        return attrs

    def create(self, validated_data):
        pharmacy_details = validated_data.pop("pharmacy_details", None)
        if pharmacy_details:
            serializer = PharmacySerializer(data=pharmacy_details)
            serializer.is_valid(raise_exception=True)
            validated_data["pharmacy"] = serializer.save()

        return FacilityPharmacyPreferenceOverride.objects.create(
            facility=self.context["facility"],
            **validated_data,
        )

    def update(self, instance, validated_data):
        pharmacy_details = validated_data.pop("pharmacy_details", None)
        if pharmacy_details:
            serializer = PharmacySerializer(
                instance.pharmacy if instance.pharmacy_id else None,
                data=pharmacy_details,
                partial=bool(instance.pharmacy_id),
            )
            serializer.is_valid(raise_exception=True)
            validated_data["pharmacy"] = serializer.save()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
