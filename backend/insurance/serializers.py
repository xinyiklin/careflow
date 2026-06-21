from rest_framework import serializers

from billing.models import OrganizationFeeSchedule

from .carrier_access import get_effective_carrier_ids
from .models import (
    FacilityInsuranceCarrierOverride,
    InsuranceCarrier,
    OrganizationInsuranceCarrierPreference,
    PatientInsurancePolicy,
)


class InsuranceCarrierSerializer(serializers.ModelSerializer):
    class Meta:
        model = InsuranceCarrier
        fields = [
            "id",
            "name",
            "payer_id",
            "phone_number",
            "website",
            "address_line_1",
            "address_line_2",
            "city",
            "state",
            "zip_code",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class OrganizationInsuranceCarrierPreferenceSerializer(serializers.ModelSerializer):
    carrier = InsuranceCarrierSerializer(read_only=True)
    fee_schedule_name = serializers.CharField(
        source="fee_schedule.name", read_only=True, default=""
    )

    class Meta:
        model = OrganizationInsuranceCarrierPreference
        fields = [
            "id",
            "organization",
            "carrier",
            "is_preferred",
            "is_hidden",
            "is_active",
            "notes",
            "sort_order",
            "fee_schedule",
            "fee_schedule_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "organization",
            "carrier",
            "fee_schedule_name",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "fee_schedule": {"required": False, "allow_null": True},
        }


class OrganizationInsuranceCarrierPreferenceWriteSerializer(serializers.Serializer):
    carrier_id = serializers.PrimaryKeyRelatedField(
        queryset=InsuranceCarrier.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )
    carrier = InsuranceCarrierSerializer(required=False)
    is_preferred = serializers.BooleanField(required=False, default=True)
    is_hidden = serializers.BooleanField(required=False, default=False)
    is_active = serializers.BooleanField(required=False, default=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    sort_order = serializers.IntegerField(required=False, min_value=0, default=0)
    fee_schedule = serializers.PrimaryKeyRelatedField(
        queryset=OrganizationFeeSchedule.objects.all(),
        required=False,
        allow_null=True,
    )

    def validate_fee_schedule(self, value):
        if value is None:
            return value
        organization = self.context.get("organization")
        if organization and value.organization_id != organization.id:
            raise serializers.ValidationError(
                "Fee schedule does not belong to this organization."
            )
        return value

    def validate(self, attrs):
        if (
            self.instance is None
            and not attrs.get("carrier_id")
            and not attrs.get("carrier")
        ):
            raise serializers.ValidationError(
                "Provide an existing carrier_id or carrier details."
            )
        return attrs

    def create(self, validated_data):
        organization = self.context["organization"]
        carrier = validated_data.pop("carrier_id", None)
        carrier_data = validated_data.pop("carrier", None)

        if carrier is None and carrier_data:
            serializer = InsuranceCarrierSerializer(data=carrier_data)
            serializer.is_valid(raise_exception=True)
            carrier = serializer.save()

        preference, _created = (
            OrganizationInsuranceCarrierPreference.objects.update_or_create(
                organization=organization,
                carrier=carrier,
                defaults=validated_data,
            )
        )
        return preference

    def update(self, instance, validated_data):
        validated_data.pop("carrier_id", None)
        carrier_data = validated_data.pop("carrier", None)

        if carrier_data:
            serializer = InsuranceCarrierSerializer(
                instance.carrier,
                data=carrier_data,
                partial=True,
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class FacilityInsuranceCarrierOverrideSerializer(serializers.ModelSerializer):
    carrier = InsuranceCarrierSerializer(read_only=True)
    carrier_id = serializers.PrimaryKeyRelatedField(
        queryset=InsuranceCarrier.objects.all(),
        source="carrier",
        required=False,
        allow_null=True,
        write_only=True,
    )
    carrier_details = InsuranceCarrierSerializer(required=False, write_only=True)
    effective_carrier = InsuranceCarrierSerializer(read_only=True)

    class Meta:
        model = FacilityInsuranceCarrierOverride
        fields = [
            "id",
            "facility",
            "organization_preference",
            "carrier",
            "carrier_id",
            "carrier_details",
            "is_preferred",
            "is_hidden",
            "is_active",
            "notes",
            "sort_order",
            "effective_carrier",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "facility",
            "carrier",
            "effective_carrier",
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
                "Selected payer does not belong to this organization."
            )
        return value

    def validate(self, attrs):
        carrier_details = attrs.get("carrier_details")
        has_org_preference = bool(attrs.get("organization_preference"))
        has_local_carrier = bool(attrs.get("carrier") or carrier_details)

        if self.instance:
            has_org_preference = bool(
                attrs.get(
                    "organization_preference", self.instance.organization_preference
                )
            )
            has_local_carrier = bool(
                attrs.get("carrier", self.instance.carrier) or carrier_details
            )

        if has_org_preference == has_local_carrier:
            raise serializers.ValidationError(
                "Provide either an organization payer or a local payer."
            )
        return attrs

    def create(self, validated_data):
        carrier_details = validated_data.pop("carrier_details", None)
        if carrier_details:
            serializer = InsuranceCarrierSerializer(data=carrier_details)
            serializer.is_valid(raise_exception=True)
            validated_data["carrier"] = serializer.save()

        return FacilityInsuranceCarrierOverride.objects.create(
            facility=self.context["facility"],
            **validated_data,
        )

    def update(self, instance, validated_data):
        carrier_details = validated_data.pop("carrier_details", None)
        if carrier_details:
            serializer = InsuranceCarrierSerializer(
                instance.carrier if instance.carrier_id else None,
                data=carrier_details,
                partial=bool(instance.carrier_id),
            )
            serializer.is_valid(raise_exception=True)
            validated_data["carrier"] = serializer.save()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


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
        read_only_fields = [
            "created_at",
            "updated_at",
            "carrier_name",
            "patient_name",
        ]

    def get_fields(self):
        fields = super().get_fields()
        # The owning patient FK is set on creation and immutable afterward: a
        # PATCH/PUT must not be able to reassign a policy (and its PHI) to a
        # different patient. It stays writable on create so the view can read it
        # from validated_data, but goes read-only once an instance exists.
        if self.instance is not None and "patient" in fields:
            fields["patient"].read_only = True
        return fields

    def validate_carrier(self, value):
        facility = self.context.get("facility")
        if facility and value.id not in get_effective_carrier_ids(facility):
            raise serializers.ValidationError(
                "Carrier is not available for this facility."
            )
        return value

    def get_patient_name(self, obj):
        return f"{obj.patient.last_name}, {obj.patient.first_name}"
