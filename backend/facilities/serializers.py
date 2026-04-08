from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (
    Facility,
    AppointmentStatus,
    AppointmentType,
    StaffRole,
    StaffTitle,
    Staff,
)

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "full_name", "email"]

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class FacilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Facility
        fields = ["id", "name"]


class AppointmentStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppointmentStatus
        fields = "__all__"


class AppointmentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppointmentType
        fields = "__all__"


class StaffRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffRole
        fields = "__all__"


class StaffTitleSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffTitle
        fields = "__all__"


class StaffSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    facility_details = FacilitySerializer(source="facility", read_only=True)
    role_details = StaffRoleSerializer(source="role", read_only=True)
    title_details = StaffTitleSerializer(source="title", read_only=True)

    class Meta:
        model = Staff
        fields = [
            "id",
            "user",
            "facility",
            "facility_details",
            "role",
            "role_details",
            "title",
            "title_details",
            "is_active",
        ]