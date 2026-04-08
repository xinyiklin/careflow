from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Facility, AppointmentStatus, AppointmentType, StaffRole, StaffTitle, Staff

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']

class AppointmentStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppointmentStatus
        fields = '__all__'

class AppointmentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppointmentType
        fields = '__all__'

class StaffRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffRole
        fields = '__all__'

class StaffTitleSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffTitle
        fields = '__all__'

class FacilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Facility
        fields = ['id', 'name']


class StaffSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    role_details = StaffRoleSerializer(source='role', read_only=True)
    title_details = StaffTitleSerializer(source='title', read_only=True)

    class Meta:
        model = Staff
        fields = [
            'id', 'user', 'facility', 'role', 
            'role_details', 'title', 'title_details', 'is_active'
        ]