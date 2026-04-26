from django.contrib.auth import get_user_model
from rest_framework import serializers

from shared.serializers import AddressSerializer

from .models import (
    AppointmentStatus,
    AppointmentType,
    Facility,
    FacilityResource,
    PatientGender,
    Staff,
    StaffRole,
    StaffTitle,
)
from .security import normalize_security_overrides, normalize_security_permissions

User = get_user_model()
VALID_OPERATING_DAYS = {1, 2, 3, 4, 5, 6, 7}


class FacilityAddressMixin:
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


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email"]


class StaffSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    display_name = serializers.SerializerMethodField()
    user_id = serializers.PrimaryKeyRelatedField(
        source="user",
        queryset=User.objects.all(),
        write_only=True,
    )

    facility = serializers.PrimaryKeyRelatedField(read_only=True)
    facility_name = serializers.CharField(source="facility.name", read_only=True)

    role = serializers.PrimaryKeyRelatedField(read_only=True)
    role_id = serializers.PrimaryKeyRelatedField(
        source="role",
        queryset=StaffRole.objects.all(),
        write_only=True,
    )
    role_name = serializers.CharField(source="role.name", read_only=True)
    role_code = serializers.CharField(source="role.code", read_only=True)

    title = serializers.PrimaryKeyRelatedField(read_only=True)
    title_id = serializers.PrimaryKeyRelatedField(
        source="title",
        queryset=StaffTitle.objects.all(),
        allow_null=True,
        required=False,
        write_only=True,
    )
    title_name = serializers.CharField(source="title.name", read_only=True)
    title_code = serializers.CharField(source="title.code", read_only=True)
    can_render_claims = serializers.SerializerMethodField()
    effective_security_permissions = serializers.SerializerMethodField()
    resource_default_room = serializers.CharField(
        source="resource.default_room", read_only=True
    )
    resource_operating_start_time = serializers.TimeField(
        source="resource.operating_start_time", read_only=True
    )
    resource_operating_end_time = serializers.TimeField(
        source="resource.operating_end_time", read_only=True
    )

    class Meta:
        model = Staff
        fields = [
            "id",
            "user",
            "display_name",
            "user_id",
            "facility",
            "facility_name",
            "role",
            "role_id",
            "role_name",
            "role_code",
            "title",
            "title_id",
            "title_name",
            "title_code",
            "is_active",
            "is_default",
            "can_render_claims",
            "resource_default_room",
            "resource_operating_start_time",
            "resource_operating_end_time",
            "security_overrides",
            "effective_security_permissions",
        ]
        read_only_fields = ["facility"]

    def get_display_name(self, obj):
        full_name = " ".join(
            part for part in [obj.user.first_name, obj.user.last_name] if part
        ).strip()
        base_name = full_name or obj.user.username
        title_name = getattr(obj.title, "name", "") or ""

        return " ".join(part for part in [title_name, base_name] if part).strip()

    def get_can_render_claims(self, obj):
        role_code = (getattr(obj.role, "code", "") or "").strip().lower()
        title_code = (getattr(obj.title, "code", "") or "").strip().lower()
        return role_code == "physician" or title_code in {
            "md",
            "do",
            "np",
            "pa",
            "cnm",
            "cns",
            "crna",
        }

    def get_effective_security_permissions(self, obj):
        return obj.effective_security_permissions

    def validate_security_overrides(self, value):
        return normalize_security_overrides(value)

    def validate(self, attrs):
        facility = self.context["view"].get_facility()
        role = attrs.get("role", getattr(self.instance, "role", None))
        title = attrs.get("title", getattr(self.instance, "title", None))
        user = attrs.get("user", getattr(self.instance, "user", None))

        if role and role.facility_id != facility.id:
            raise serializers.ValidationError(
                {"role_id": "Role must belong to the selected facility."}
            )

        if title and title.facility_id != facility.id:
            raise serializers.ValidationError(
                {"title_id": "Title must belong to the selected facility."}
            )

        if user:
            membership = getattr(user, "org_membership", None)
            if not membership or not membership.is_active:
                raise serializers.ValidationError(
                    {"user_id": "User must belong to an active organization."}
                )

            if membership.organization_id != facility.organization_id:
                raise serializers.ValidationError(
                    {
                        "user_id": "User must belong to the same organization as the facility."
                    }
                )

        return attrs


class FacilitySerializer(FacilityAddressMixin, serializers.ModelSerializer):
    timezone = serializers.CharField()
    address = AddressSerializer(required=False, allow_null=True)
    organization_name = serializers.CharField(
        source="organization.name", read_only=True
    )

    class Meta:
        model = Facility
        fields = [
            "id",
            "organization",
            "organization_name",
            "name",
            "facility_code",
            "address",
            "phone_number",
            "fax_number",
            "email",
            "timezone",
            "operating_start_time",
            "operating_end_time",
            "operating_days",
            "notes",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["organization", "organization_name", "created_at"]

    def validate_operating_days(self, value):
        if value in (None, ""):
            raise serializers.ValidationError("Select at least one operating day.")
        if not isinstance(value, list):
            raise serializers.ValidationError("Operating days must be a list.")

        normalized_days = []
        for item in value:
            try:
                day = int(item)
            except (TypeError, ValueError):
                raise serializers.ValidationError(
                    "Operating days must use numbers 1 through 7."
                )
            if day not in VALID_OPERATING_DAYS:
                raise serializers.ValidationError(
                    "Operating days must use numbers 1 through 7."
                )
            if day not in normalized_days:
                normalized_days.append(day)

        if not normalized_days:
            raise serializers.ValidationError("Select at least one operating day.")

        return normalized_days

    def validate(self, attrs):
        start_time = attrs.get(
            "operating_start_time",
            getattr(self.instance, "operating_start_time", None),
        )
        end_time = attrs.get(
            "operating_end_time",
            getattr(self.instance, "operating_end_time", None),
        )

        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError(
                {"operating_end_time": "End time must be after start time."}
            )

        return attrs

    def create(self, validated_data):
        address_data = validated_data.pop("address", serializers.empty)
        facility = Facility(**validated_data)

        if address_data is not serializers.empty:
            self._save_address(facility, {"address": address_data})

        facility.save()
        return facility

    def update(self, instance, validated_data):
        self._save_address(instance, validated_data)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance


class AppointmentStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppointmentStatus
        fields = [
            "id",
            "facility",
            "code",
            "name",
            "color",
            "is_active",
            "is_deletable",
        ]
        read_only_fields = ["facility"]


class AppointmentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppointmentType
        fields = [
            "id",
            "facility",
            "code",
            "name",
            "color",
            "duration_minutes",
            "is_active",
            "is_deletable",
        ]
        read_only_fields = ["facility"]


class FacilityResourceSerializer(serializers.ModelSerializer):
    linked_staff_name = serializers.SerializerMethodField()

    class Meta:
        model = FacilityResource
        fields = [
            "id",
            "facility",
            "name",
            "default_room",
            "operating_start_time",
            "operating_end_time",
            "linked_staff",
            "linked_staff_name",
            "is_active",
            "is_deletable",
            "created_at",
        ]
        read_only_fields = [
            "facility",
            "linked_staff",
            "linked_staff_name",
            "is_deletable",
            "created_at",
        ]

    def validate(self, attrs):
        start_time = attrs.get(
            "operating_start_time",
            getattr(self.instance, "operating_start_time", None),
        )
        end_time = attrs.get(
            "operating_end_time",
            getattr(self.instance, "operating_end_time", None),
        )

        if bool(start_time) != bool(end_time):
            raise serializers.ValidationError(
                {
                    "operating_start_time": "Set both start and end times, or leave both blank."
                }
            )

        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError(
                {"operating_end_time": "End time must be after start time."}
            )

        return attrs

    def get_linked_staff_name(self, obj):
        staff = getattr(obj, "linked_staff", None)
        if not staff or not staff.user_id:
            return ""

        full_name = " ".join(
            part for part in [staff.user.first_name, staff.user.last_name] if part
        ).strip()
        base_name = full_name or staff.user.username
        title_name = getattr(staff.title, "name", "") or ""

        return " ".join(part for part in [title_name, base_name] if part).strip()


class StaffRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffRole
        fields = [
            "id",
            "facility",
            "code",
            "name",
            "security_permissions",
            "is_system_role",
            "is_deletable",
            "is_active",
        ]
        read_only_fields = ["facility", "is_system_role", "is_deletable"]

    def validate_security_permissions(self, value):
        return normalize_security_permissions(value)


class StaffTitleSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffTitle
        fields = [
            "id",
            "facility",
            "code",
            "name",
            "is_active",
            "is_deletable",
        ]
        read_only_fields = ["facility", "is_deletable"]


class PatientGenderSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientGender
        fields = [
            "id",
            "facility",
            "code",
            "name",
            "sort_order",
            "is_active",
            "is_deletable",
        ]
        read_only_fields = ["facility", "is_deletable"]
