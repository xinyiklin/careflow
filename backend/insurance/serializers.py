from rest_framework import serializers

from .models import InsuranceCarrier, PatientInsurancePolicy


class InsuranceCarrierSerializer(serializers.ModelSerializer):
    class Meta:
        model = InsuranceCarrier
        fields = [
            "id",
            "name",
            "payer_id",
            "phone_number",
            "website",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class PatientInsurancePolicySerializer(serializers.ModelSerializer):
    carrier_name = serializers.CharField(source="carrier.name", read_only=True)
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model = PatientInsurancePolicy
        fields = [
            "id",
            "patient",
            "patient_name",
            "carrier",
            "carrier_name",
            "plan_name",
            "member_id",
            "group_number",
            "subscriber_name",
            "relationship_to_subscriber",
            "effective_date",
            "termination_date",
            "coverage_order",
            "is_primary",
            "is_active",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "carrier_name", "patient_name"]

    def get_patient_name(self, obj):
        return f"{obj.patient.last_name}, {obj.patient.first_name}"
