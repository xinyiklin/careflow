from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from facilities.models import Staff

from .models import User, UserPreference


def get_active_staff_profiles(user):
    if not user or not user.is_authenticated:
        return []

    return list(
        Staff.objects.filter(user=user, is_active=True)
        .select_related("facility", "facility__organization", "role", "title")
        .order_by("-is_default", "facility__name", "facility_id")
    )


def get_assigned_facility_id(user, preferred_facility_id=None):
    memberships = get_active_staff_profiles(user)
    if not memberships:
        return ""

    if preferred_facility_id not in (None, ""):
        preferred_facility_id = str(preferred_facility_id)
        has_preferred_membership = any(
            str(membership.facility_id) == preferred_facility_id
            for membership in memberships
        )
        if has_preferred_membership:
            return preferred_facility_id

    return str(memberships[0].facility_id)


def resolve_user_preferences(user, preferences):
    resolved_preferences = dict(preferences or {})
    assigned_facility_id = get_assigned_facility_id(
        user,
        resolved_preferences.get("lastFacilityId")
        or resolved_preferences.get("defaultFacilityId"),
    )

    if assigned_facility_id:
        resolved_preferences["lastFacilityId"] = assigned_facility_id
    else:
        resolved_preferences.pop("lastFacilityId", None)
    resolved_preferences.pop("defaultFacilityId", None)

    return resolved_preferences


def get_active_staff_profile(user):
    if not user or not user.is_authenticated:
        return None

    memberships = get_active_staff_profiles(user)

    if len(memberships) == 1:
        return memberships[0]

    preference_record = getattr(user, "preference_record", None)
    preferences = getattr(preference_record, "preferences", {}) or {}
    preferred_facility_id = preferences.get("lastFacilityId") or preferences.get(
        "defaultFacilityId"
    )
    if preferred_facility_id:
        preferred_memberships = [
            membership
            for membership in memberships
            if str(membership.facility_id) == str(preferred_facility_id)
        ]
        if len(preferred_memberships) == 1:
            return preferred_memberships[0]

    default_memberships = [
        membership for membership in memberships if membership.is_default
    ]
    if len(default_memberships) == 1:
        return default_memberships[0]

    return memberships[0] if memberships else None


class StaffMembershipSerializer(serializers.ModelSerializer):
    facility = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    effective_security_permissions = serializers.SerializerMethodField()

    class Meta:
        model = Staff
        fields = [
            "id",
            "facility",
            "role",
            "title",
            "is_active",
            "is_default",
            "effective_security_permissions",
        ]

    def get_facility(self, obj):
        return {
            "id": obj.facility.id,
            "name": obj.facility.name,
            "timezone": str(obj.facility.timezone),
            "operating_start_time": obj.facility.operating_start_time,
            "operating_end_time": obj.facility.operating_end_time,
            "operating_days": obj.facility.operating_days,
            "organization": {
                "id": obj.facility.organization.id,
                "name": obj.facility.organization.name,
                "slug": obj.facility.organization.slug,
            },
        }

    def get_role(self, obj):
        return {
            "id": obj.role.id,
            "name": obj.role.name,
            "code": obj.role.code,
        }

    def get_title(self, obj):
        if not obj.title:
            return None

        return {
            "id": obj.title.id,
            "name": obj.title.name,
            "code": obj.title.code,
        }

    def get_effective_security_permissions(self, obj):
        return obj.effective_security_permissions


class UserSerializer(serializers.ModelSerializer):
    organization = serializers.SerializerMethodField()
    organization_role = serializers.SerializerMethodField()
    memberships = serializers.SerializerMethodField()
    current_membership = serializers.SerializerMethodField()
    is_org_admin = serializers.SerializerMethodField()
    admin_facility_ids = serializers.SerializerMethodField()
    preferences = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "last_name",
            "first_name",
            "phone_number",
            "organization",
            "organization_role",
            "memberships",
            "current_membership",
            "is_org_admin",
            "admin_facility_ids",
            "preferences",
        ]

    def get_organization(self, obj):
        membership = getattr(obj, "org_membership", None)
        if not membership or not membership.is_active:
            return None

        return {
            "id": membership.organization.id,
            "name": membership.organization.name,
            "slug": membership.organization.slug,
        }

    def get_organization_role(self, obj):
        membership = getattr(obj, "org_membership", None)
        if not membership or not membership.is_active:
            return None

        return membership.role

    def get_memberships(self, obj):
        preference_record = getattr(obj, "preference_record", None)
        preferences = getattr(preference_record, "preferences", {}) or {}
        preferred_facility_id = get_assigned_facility_id(
            obj,
            preferences.get("lastFacilityId") or preferences.get("defaultFacilityId"),
        )
        profiles = list(
            Staff.objects.filter(user=obj, is_active=True)
            .select_related("facility", "facility__organization", "role", "title")
            .order_by("-is_default", "facility__name")
        )
        if preferred_facility_id:
            profiles.sort(
                key=lambda profile: (
                    str(profile.facility_id) != str(preferred_facility_id),
                    not profile.is_default,
                    profile.facility.name,
                )
            )
        return StaffMembershipSerializer(profiles, many=True).data

    def get_current_membership(self, obj):
        profile = get_active_staff_profile(obj)
        if not profile:
            return None
        return StaffMembershipSerializer(profile).data

    def get_is_org_admin(self, obj):
        membership = getattr(obj, "org_membership", None)
        if not membership or not membership.is_active:
            return False

        return membership.role in ["owner", "admin"]

    def get_admin_facility_ids(self, obj):
        profiles = Staff.objects.filter(user=obj, is_active=True).select_related("role")

        admin_ids = []
        for profile in profiles:
            if profile.role and profile.role.code == "admin":
                admin_ids.append(profile.facility_id)

        return admin_ids

    def get_preferences(self, obj):
        preference_record = getattr(obj, "preference_record", None)
        preferences = preference_record.preferences if preference_record else {}
        return resolve_user_preferences(obj, preferences)


class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = ["preferences"]

    def validate_preferences(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Preferences must be an object.")

        preferences = dict(value)
        last_facility_id = preferences.get("lastFacilityId")
        legacy_default_facility_id = preferences.get("defaultFacilityId")
        submitted_facility_id = last_facility_id or legacy_default_facility_id
        preferences.pop("defaultFacilityId", None)

        if submitted_facility_id in (None, ""):
            resolved_facility_id = get_assigned_facility_id(self.instance.user)
            if resolved_facility_id:
                preferences["lastFacilityId"] = resolved_facility_id
            else:
                preferences.pop("lastFacilityId", None)
            return preferences

        submitted_facility_id = str(submitted_facility_id)
        has_membership = Staff.objects.filter(
            user=self.instance.user,
            facility_id=submitted_facility_id,
            is_active=True,
        ).exists()
        if not has_membership:
            raise serializers.ValidationError(
                {"lastFacilityId": "Choose a facility assigned to this user."}
            )

        preferences["lastFacilityId"] = submitted_facility_id
        return preferences


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
            "phone_number",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user
