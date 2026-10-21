from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from facilities.access import validate_staff_security_transition
from facilities.models import Facility, Staff, StaffRole
from facilities.security import (
    SELF_MANAGEMENT_PERMISSIONS,
    resolve_effective_permissions,
)
from patients.models import Pharmacy
from patients.serializers import PharmacySerializer
from shared.serializers import AddressSerializer, StrictPayloadMixin

from .models import (
    FacilityPharmacyPreferenceOverride,
    Organization,
    OrganizationMembership,
    OrganizationPharmacyPreference,
    OrganizationRole,
)
from .security import normalize_org_security_permissions

User = get_user_model()

DEFAULT_STAFF_ROLE_CODE = "staff"


def validate_membership_role_code(role, organization):
    """Accept only codes the organization defines: the system roles or its
    active ``OrganizationRole`` rows, matched exactly.

    Permissions resolve from the role code by exact match, so an unknown or
    case-variant code ("Admin") must be refused rather than fall through to a
    template the owner never edited.
    """
    allowed = set(OrganizationRole.SYSTEM_ROLES)
    if organization is not None:
        allowed |= set(
            OrganizationRole.objects.filter(
                organization=organization, is_active=True
            ).values_list("code", flat=True)
        )
    if role not in allowed:
        raise serializers.ValidationError("Unknown organization role.")
    return role


def _grants_any_self_management(role):
    effective = resolve_effective_permissions(role.security_permissions, {})
    return any(effective.get(permission) for permission in SELF_MANAGEMENT_PERMISSIONS)


def get_default_non_admin_role(facility):
    """Role granted when a person is assigned to a facility without the admin
    flag: the facility's ``staff`` role, else the first active role that holds
    neither self-management permission (either one lets the holder reach
    administration or the security panel).

    Never falls back to an arbitrary row: ``StaffRole`` orders by name, so a
    bare ``.first()`` resolves to Admin and silently escalates the person.
    """
    role = StaffRole.objects.filter(
        facility=facility, code=DEFAULT_STAFF_ROLE_CODE, is_active=True
    ).first()
    if role is not None and _grants_any_self_management(role):
        # A ``staff`` role customized to reach administration is no safer a
        # default than Admin; fall through to the filtered search.
        role = None
    if role is None:
        role = next(
            (
                candidate
                for candidate in StaffRole.objects.filter(
                    facility=facility, is_active=True
                ).order_by("name")
                if not _grants_any_self_management(candidate)
            ),
            None,
        )
    if role is None:
        raise serializers.ValidationError(
            {
                "facility_ids": (
                    f"{facility.name} has no non-administrative role to assign."
                )
            }
        )
    return role


def get_facility_admin_role(facility):
    """The facility's active ``admin`` role, used when the admin flag is set."""
    role = StaffRole.objects.filter(
        facility=facility, code="admin", is_active=True
    ).first()
    if role is None:
        raise serializers.ValidationError(
            {"admin_facility_ids": f"{facility.name} has no active admin role."}
        )
    return role


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


def build_membership_access_audit_event(*, staff, membership, membership_is_active):
    """Assemble a facility-scoped security audit event for a Staff row whose
    facility access changed only because its org membership was (de)activated.

    The Staff row itself is not modified; an inactive membership grants no
    facility access, so this is how facility audit viewers see the change.
    """
    if membership_is_active:
        summary = (
            f"Facility access restored for {staff.user}: "
            "organization membership reactivated"
        )
    else:
        summary = (
            f"Facility access removed for {staff.user}: "
            "organization membership deactivated"
        )
    return {
        "facility": staff.facility,
        "object_pk": staff.pk,
        "action": "update",
        "summary": summary,
        "metadata": {
            "changed_fields": ["organization_membership_is_active"],
            "previous": {"membership_is_active": not membership_is_active},
            "next": {"membership_is_active": membership_is_active},
            "staff_is_active": staff.is_active,
            "role_id": staff.role_id,
            "user_id": staff.user_id,
            "membership_id": membership.pk,
            "organization_id": membership.organization_id,
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


class OrganizationRoleSerializer(StrictPayloadMixin, serializers.ModelSerializer):
    """Organization role catalog entry.

    Permissions are read here and edited through the security
    ``update-role`` action, which syncs member snapshots and enforces the
    self-lockout guard.
    """

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
        # Permissions change only through the security ``update-role`` action,
        # which syncs member snapshots and enforces the self-lockout guard.
        read_only_fields = [
            "id",
            "security_permissions",
            "is_system_role",
            "is_deletable",
        ]


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

    def validate_role(self, value):
        return validate_membership_role_code(value, self.context.get("organization"))

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
        # Staff rows this request creates or reactivates; on membership
        # reactivation their own staff event already records the access grant.
        newly_active_staff_ids = set()

        with transaction.atomic():
            user = instance.user
            membership_was_active = instance.is_active
            membership_previous_role = instance.role
            membership_will_be_active = validated_data.get(
                "is_active", membership_was_active
            )
            if instance.is_active and not validated_data.get("is_active", True):
                # An inactive membership grants no facility access, so this
                # removes the person as an administrator everywhere at once.
                for staff in (
                    Staff.objects.filter(
                        user=user,
                        facility__organization=instance.organization,
                        is_active=True,
                    )
                    .select_related("facility", "role")
                    .order_by("facility_id")
                ):
                    validate_staff_security_transition(
                        actor=self.context["request"].user,
                        facility=staff.facility,
                        staff=staff,
                        prospective_role=staff.role,
                        prospective_overrides=staff.security_overrides,
                        prospective_is_active=False,
                    )

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

                    is_admin = facility.id in target_admin_ids
                    # New rows stay unsaved until the membership state is
                    # settled below; Staff.clean needs an active membership.
                    staff = Staff.objects.filter(user=user, facility=facility).first()
                    created = staff is None
                    if created:
                        staff = Staff(
                            user=user,
                            facility=facility,
                            role=(
                                get_facility_admin_role(facility)
                                if is_admin
                                else get_default_non_admin_role(facility)
                            ),
                            is_active=True,
                        )
                    previous_role_id = staff.role_id
                    previous_is_active = staff.is_active
                    prospective_role = staff.role
                    current_role_code = staff.role.code if staff.role else ""

                    if is_admin and current_role_code != "admin":
                        prospective_role = get_facility_admin_role(facility)
                    elif not is_admin and current_role_code == "admin":
                        prospective_role = get_default_non_admin_role(facility)

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

                if (
                    staff_to_update
                    and not membership_was_active
                    and not membership_will_be_active
                ):
                    raise serializers.ValidationError(
                        {"is_active": "Inactive people cannot be assigned facilities."}
                    )

                if membership_will_be_active and not membership_was_active:
                    # Staff.clean requires an active membership. The guards
                    # above have already run against the pre-request state.
                    instance.is_active = True
                    instance.save(update_fields=["is_active"])

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
                    if created or not previous_is_active:
                        newly_active_staff_ids.add(staff.pk)
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
            if instance.role != membership_previous_role:
                # The stored map is a per-role snapshot; carrying it across a
                # role change would let a demoted admin keep admin permissions.
                instance.security_permissions = {}
            instance.save()

            if instance.is_active != membership_was_active:
                # Staff rows deactivated via facility_ids above already have
                # their own event; cover the ones still active. On reactivation,
                # rows this request created or reactivated are covered too.
                for staff in (
                    Staff.objects.filter(
                        user=user,
                        facility__organization=instance.organization,
                        is_active=True,
                    )
                    .exclude(
                        pk__in=newly_active_staff_ids if instance.is_active else []
                    )
                    .select_related("facility", "user")
                    .order_by("facility_id")
                ):
                    self.security_audit_events.append(
                        build_membership_access_audit_event(
                            staff=staff,
                            membership=instance,
                            membership_is_active=instance.is_active,
                        )
                    )

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

    def validate_role(self, value):
        return validate_membership_role_code(value, self.context.get("organization"))

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
                    role = (
                        get_facility_admin_role(fac)
                        if is_admin
                        else get_default_non_admin_role(fac)
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
