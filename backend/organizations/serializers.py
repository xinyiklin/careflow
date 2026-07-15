from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from facilities.access import validate_staff_security_transition
from facilities.models import Facility, Staff, StaffRole
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


def build_staff_security_audit_event(
    *,
    facility,
    staff,
    previous_role_id,
    previous_is_active,
    next_role_id,
    next_is_active,
    created,
):
    """Assemble a facility-scoped security audit event for a Staff mutation.

    Mirrors the facility /staff/ endpoint's event shape (app_label="facilities",
    model_name="staff", facility set) so both surfaces group identically and a
    facility admin can see staff changes made through the org People path.
    """
    changed_fields = []
    if created:
        changed_fields.append("Created")
    else:
        if previous_role_id != next_role_id:
            changed_fields.append("role_id")
        if previous_is_active != next_is_active:
            changed_fields.append("is_active")
    verb = "Created" if created else "Updated"
    return {
        "facility": facility,
        "object_pk": staff.pk,
        "action": "create" if created else "update",
        "summary": f"{verb} staff membership for {staff.user}",
        "metadata": {
            "changed_fields": changed_fields,
            "previous": {
                "role_id": previous_role_id,
                "is_active": previous_is_active,
            },
            "next": {
                "role_id": next_role_id,
                "is_active": next_is_active,
            },
            "user_id": staff.user_id,
            "via": "organization_people",
        },
    }


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


class OrganizationSecurityRoleSerializer(serializers.Serializer):
    """One organization role and its effective security permissions."""

    id = serializers.IntegerField()
    key = serializers.CharField()
    label = serializers.CharField()
    is_system_role = serializers.BooleanField()
    is_deletable = serializers.BooleanField()
    description = serializers.CharField(allow_blank=True)
    security_permissions = serializers.DictField(child=serializers.BooleanField())
    member_count = serializers.IntegerField()


class OrganizationSecurityUpdateResultSerializer(serializers.Serializer):
    """Result returned after updating one organization role's permissions."""

    role = serializers.CharField()
    security_permissions = serializers.DictField(child=serializers.BooleanField())
    members_updated = serializers.IntegerField()


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

        # OrganizationPeopleViewSet prefetches the org-scoped active profiles
        # into this attr (one query for the whole page); use it when present.
        prefetched = getattr(obj.user, "active_org_staff_profiles", None)
        if prefetched is not None:
            cache[obj.pk] = prefetched
            return prefetched

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
        # Facility Staff rows created/re-roled/deactivated below carry the same
        # security weight as the facility twin's own /staff/ endpoint; collect
        # them so the view can emit a facility-scoped security audit event per
        # row (the org-membership audit alone is not facility-scoped, so a
        # facility admin could never see they gained or lost an administrator).
        self.security_audit_events = []

        with transaction.atomic():
            user = instance.user
            if facility_ids is not None:
                org_facilities = list(
                    Facility.objects.filter(
                        organization=instance.organization
                    ).order_by("id")
                )
                org_facility_ids = {facility.id for facility in org_facilities}
                target_facility_ids = set(facility_ids) & org_facility_ids
                target_admin_ids = set(admin_facility_ids or []) & target_facility_ids

                staff_to_deactivate = list(
                    Staff.objects.filter(
                        user=user,
                        facility__organization=instance.organization,
                        is_active=True,
                    )
                    .exclude(facility_id__in=target_facility_ids)
                    .select_related("facility", "role")
                )
                for staff in staff_to_deactivate:
                    validate_staff_security_transition(
                        actor=self.context["request"].user,
                        facility=staff.facility,
                        staff=staff,
                        prospective_role=staff.role,
                        prospective_overrides=staff.security_overrides,
                        prospective_is_active=False,
                    )

                for staff in staff_to_deactivate:
                    self._record_staff_security_event(
                        facility=staff.facility,
                        staff=staff,
                        previous_role_id=staff.role_id,
                        previous_is_active=staff.is_active,
                        next_role_id=staff.role_id,
                        next_is_active=False,
                        created=False,
                    )

                staff_to_update = []
                for facility in org_facilities:
                    if facility.id not in target_facility_ids:
                        continue

                    default_role = (
                        StaffRole.objects.filter(
                            facility=facility, code="front_desk"
                        ).first()
                        or StaffRole.objects.filter(facility=facility).first()
                    )
                    staff, created = Staff.objects.get_or_create(
                        user=user,
                        facility=facility,
                        defaults={"role": default_role, "is_active": True},
                    )
                    previous_role_id = staff.role_id
                    previous_is_active = staff.is_active
                    prospective_role = staff.role
                    is_admin = facility.id in target_admin_ids
                    current_role_code = staff.role.code if staff.role else ""

                    if is_admin and current_role_code != "admin":
                        admin_role = StaffRole.objects.filter(
                            facility=facility,
                            code="admin",
                        ).first()
                        if admin_role:
                            prospective_role = admin_role
                    elif not is_admin and current_role_code == "admin":
                        non_admin_role = (
                            StaffRole.objects.filter(facility=facility)
                            .exclude(code="admin")
                            .first()
                        )
                        if non_admin_role:
                            prospective_role = non_admin_role

                    role_is_changing = staff.role_id != getattr(
                        prospective_role,
                        "id",
                        None,
                    )
                    if not created and staff.is_active and role_is_changing:
                        staff = validate_staff_security_transition(
                            actor=self.context["request"].user,
                            facility=facility,
                            staff=staff,
                            prospective_role=prospective_role,
                            prospective_overrides=staff.security_overrides,
                            prospective_is_active=True,
                        )

                    if created or not staff.is_active or role_is_changing:
                        staff_to_update.append(
                            (
                                staff,
                                prospective_role,
                                created,
                                previous_role_id,
                                previous_is_active,
                            )
                        )

                Staff.objects.filter(
                    user=user,
                    facility__organization=instance.organization,
                ).exclude(facility_id__in=target_facility_ids).update(is_active=False)

                for (
                    staff,
                    prospective_role,
                    created,
                    previous_role_id,
                    previous_is_active,
                ) in staff_to_update:
                    staff.is_active = True
                    staff.role = prospective_role
                    staff.save()
                    self._record_staff_security_event(
                        facility=staff.facility,
                        staff=staff,
                        previous_role_id=None if created else previous_role_id,
                        previous_is_active=False if created else previous_is_active,
                        next_role_id=staff.role_id,
                        next_is_active=True,
                        created=created,
                    )

            for attr, value in user_data.items():
                setattr(user, attr, value)
            user.save()

            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

        return instance

    def _record_staff_security_event(self, **kwargs):
        self.security_audit_events.append(build_staff_security_audit_event(**kwargs))


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
        self.security_audit_events = []

        with transaction.atomic():
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

            org_facilities = list(Facility.objects.filter(organization=organization))
            org_facility_ids = {facility.id for facility in org_facilities}
            target_facility_ids = set(facility_ids) & org_facility_ids
            target_admin_ids = set(admin_facility_ids) & target_facility_ids

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

                    staff = Staff.objects.create(
                        user=user, facility=fac, role=role, is_active=True
                    )
                    self.security_audit_events.append(
                        build_staff_security_audit_event(
                            facility=fac,
                            staff=staff,
                            previous_role_id=None,
                            previous_is_active=False,
                            next_role_id=staff.role_id,
                            next_is_active=True,
                            created=True,
                        )
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
        if pharmacy and (
            pharmacy.owning_facility_id
            or (
                pharmacy.owning_organization_id
                and pharmacy.owning_organization_id != organization.id
            )
        ):
            raise serializers.ValidationError(
                {
                    "pharmacy_id": "This private pharmacy is not available to the organization."
                }
            )
        return attrs

    def create(self, validated_data):
        organization = self.context["organization"]
        pharmacy = validated_data.pop("pharmacy_id", None)
        pharmacy_data = validated_data.pop("pharmacy", None)

        if pharmacy is None and pharmacy_data:
            serializer = PharmacySerializer(data=pharmacy_data)
            serializer.is_valid(raise_exception=True)
            pharmacy = serializer.save(
                owning_organization=organization,
                source=Pharmacy.SOURCE_CUSTOM,
                external_id="",
                directory_source="",
            )

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
            if instance.pharmacy.owning_organization_id != instance.organization_id:
                raise serializers.ValidationError(
                    {
                        "pharmacy": (
                            "Global pharmacy details are maintained by the directory. "
                            "Only organization-owned custom pharmacies can be edited here."
                        )
                    }
                )
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
        pharmacy = attrs.get("pharmacy")
        facility = self.context["facility"]
        if pharmacy and (
            (
                pharmacy.owning_organization_id
                and pharmacy.owning_organization_id != facility.organization_id
            )
            or (
                pharmacy.owning_facility_id
                and pharmacy.owning_facility_id != facility.id
            )
        ):
            raise serializers.ValidationError(
                {
                    "pharmacy_id": "This private pharmacy is not available to the facility."
                }
            )
        if (
            pharmacy
            and not self.instance
            and OrganizationPharmacyPreference.objects.filter(
                organization=facility.organization,
                pharmacy=pharmacy,
            ).exists()
        ):
            raise serializers.ValidationError(
                {
                    "pharmacy_id": (
                        "This pharmacy is already available through the organization. "
                        "Create an organization-preference override instead."
                    )
                }
            )
        return attrs

    def create(self, validated_data):
        pharmacy_details = validated_data.pop("pharmacy_details", None)
        if pharmacy_details:
            serializer = PharmacySerializer(data=pharmacy_details)
            serializer.is_valid(raise_exception=True)
            validated_data["pharmacy"] = serializer.save(
                owning_facility=self.context["facility"],
                source=Pharmacy.SOURCE_CUSTOM,
                external_id="",
                directory_source="",
            )

        return FacilityPharmacyPreferenceOverride.objects.create(
            facility=self.context["facility"],
            **validated_data,
        )

    def update(self, instance, validated_data):
        pharmacy_details = validated_data.pop("pharmacy_details", None)
        if pharmacy_details:
            if (
                not instance.pharmacy_id
                or instance.pharmacy.owning_facility_id != instance.facility_id
            ):
                raise serializers.ValidationError(
                    {
                        "pharmacy_details": (
                            "Global and organization pharmacy details cannot be edited "
                            "from a facility link."
                        )
                    }
                )
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
