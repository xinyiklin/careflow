from rest_framework import serializers
from .models import Patient

class PatientSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)

    class Meta:
        model = Patient
        fields = [
            'id', 
            'facility', 
            'first_name', 
            'last_name', 
            'full_name', 
            'date_of_birth', 
            'gender', 
            'gender_display',
            'chart_number', 
            'is_active'
        ]

        read_only_fields = ['facility']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"