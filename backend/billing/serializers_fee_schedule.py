from rest_framework import serializers

from shared.serializers import StrictPayloadMixin

from .models import (
    FacilityFeeScheduleOverride,
    OrganizationFeeSchedule,
    OrganizationFeeScheduleItem,
)


class EffectiveFeeScheduleItemSerializer(serializers.Serializer):
    id = serializers.CharField()
    organization_item = serializers.IntegerField(allow_null=True)
    facility_override = serializers.IntegerField(allow_null=True)
    catalog_source = serializers.CharField()
    service_code = serializers.CharField()
    description = serializers.CharField()
    default_units = serializers.DecimalField(max_digits=6, decimal_places=2)
    charge_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    modifier_1 = serializers.CharField(allow_blank=True)
    modifier_2 = serializers.CharField(allow_blank=True)
    modifier_3 = serializers.CharField(allow_blank=True)
    modifier_4 = serializers.CharField(allow_blank=True)
    place_of_service = serializers.CharField(allow_blank=True)
    is_active = serializers.BooleanField()
    sort_order = serializers.IntegerField()


class OrganizationFeeScheduleItemSerializer(
    StrictPayloadMixin,
    serializers.ModelSerializer,
):
    class Meta:
        model = OrganizationFeeScheduleItem
        fields = [
            "id",
            "organization",
            "schedule",
            "service_code",
            "description",
            "default_units",
            "charge_amount",
            "modifier_1",
            "modifier_2",
            "modifier_3",
            "modifier_4",
            "place_of_service",
            "is_active",
            "sort_order",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "organization",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "schedule": {"required": False, "allow_null": True},
            "default_units": {"required": False},
            "place_of_service": {"required": False},
            "is_active": {"required": False},
            "sort_order": {"required": False},
            "modifier_1": {"required": False},
            "modifier_2": {"required": False},
            "modifier_3": {"required": False},
            "modifier_4": {"required": False},
        }

    def validate_schedule(self, value):
        organization = self.context.get("organization")
        if value and organization and value.organization_id != organization.id:
            raise serializers.ValidationError(
                "Fee schedule must belong to this organization."
            )
        return value

    def validate_service_code(self, value):
        return (value or "").strip().upper()

    def validate_description(self, value):
        return (value or "").strip()

    def validate_modifier_1(self, value):
        return (value or "").strip().upper()

    def validate_modifier_2(self, value):
        return (value or "").strip().upper()

    def validate_modifier_3(self, value):
        return (value or "").strip().upper()

    def validate_modifier_4(self, value):
        return (value or "").strip().upper()

    def validate_place_of_service(self, value):
        return (value or "").strip()

    def validate_default_units(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Default units must be greater than zero."
            )
        return value

    def validate_charge_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Charge amount cannot be negative.")
        return value

    def create(self, validated_data):
        request = self.context.get("request")
        organization = self.context["organization"]
        schedule = validated_data.get("schedule")
        if not schedule:
            validated_data["schedule"] = (
                OrganizationFeeSchedule.get_default_for_organization(
                    organization,
                    user=getattr(request, "user", None),
                )
            )
        return OrganizationFeeScheduleItem.objects.create(
            organization=organization,
            created_by=getattr(request, "user", None),
            updated_by=getattr(request, "user", None),
            **validated_data,
        )

    def update(self, instance, validated_data):
        request = self.context.get("request")
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.updated_by = getattr(request, "user", None)
        instance.save()
        return instance


class OrganizationFeeScheduleSerializer(
    StrictPayloadMixin,
    serializers.ModelSerializer,
):
    item_count = serializers.SerializerMethodField()
    linked_entities = serializers.SerializerMethodField()
    source_schedule_name = serializers.CharField(
        source="source_schedule.name",
        read_only=True,
        default=None,
    )

    class Meta:
        model = OrganizationFeeSchedule
        fields = [
            "id",
            "organization",
            "facility",
            "source_schedule",
            "source_schedule_name",
            "name",
            "code",
            "is_default",
            "is_active",
            "notes",
            "sort_order",
            "item_count",
            "linked_entities",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "organization",
            "facility",
            "source_schedule",
            "source_schedule_name",
            "item_count",
            "linked_entities",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "code": {"required": False},
            "is_default": {"required": False},
            "is_active": {"required": False},
            "notes": {"required": False},
            "sort_order": {"required": False},
        }

    def get_item_count(self, obj):
        return getattr(obj, "item_count", None) or obj.items.count()

    def get_linked_entities(self, obj):
        facilities = list(obj.linked_facilities.values_list("name", flat=True)[:5])
        staff = list(
            obj.linked_staff.select_related("user").values_list(
                "user__first_name", "user__last_name"
            )[:5]
        )
        payers = list(
            obj.linked_payer_preferences.select_related("carrier").values_list(
                "carrier__name", flat=True
            )[:5]
        )
        return {
            "facilities": facilities,
            "staff": [
                " ".join(part for part in name if part).strip() or "Staff"
                for name in staff
            ],
            "payers": payers,
        }

    def validate_code(self, value):
        return (value or "").strip().lower().replace(" ", "-")

    def validate_name(self, value):
        return (value or "").strip()

    def validate_notes(self, value):
        return (value or "").strip()

    def _default_code(self, name):
        return "-".join((name or "fee-schedule").lower().split())[:64]

    def create(self, validated_data):
        request = self.context.get("request")
        organization = self.context["organization"]
        if not validated_data.get("code"):
            validated_data["code"] = self._default_code(validated_data.get("name"))
        return OrganizationFeeSchedule.objects.create(
            organization=organization,
            created_by=getattr(request, "user", None),
            updated_by=getattr(request, "user", None),
            **validated_data,
        )

    def update(self, instance, validated_data):
        request = self.context.get("request")
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.updated_by = getattr(request, "user", None)
        instance.save()
        return instance


class FacilityFeeScheduleOverrideSerializer(
    StrictPayloadMixin,
    serializers.ModelSerializer,
):
    effective_service_code = serializers.CharField(read_only=True)
    effective_description = serializers.CharField(read_only=True)
    effective_default_units = serializers.DecimalField(
        max_digits=6,
        decimal_places=2,
        read_only=True,
    )
    effective_charge_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = FacilityFeeScheduleOverride
        fields = [
            "id",
            "facility",
            "organization_item",
            "service_code",
            "description",
            "default_units",
            "charge_amount",
            "modifier_1",
            "modifier_2",
            "modifier_3",
            "modifier_4",
            "place_of_service",
            "is_active",
            "sort_order",
            "effective_service_code",
            "effective_description",
            "effective_default_units",
            "effective_charge_amount",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "facility",
            "effective_service_code",
            "effective_description",
            "effective_default_units",
            "effective_charge_amount",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "organization_item": {"required": False, "allow_null": True},
            "service_code": {"required": False},
            "description": {"required": False},
            "default_units": {"required": False, "allow_null": True},
            "charge_amount": {"required": False, "allow_null": True},
            "place_of_service": {"required": False},
            "is_active": {"required": False},
            "sort_order": {"required": False, "allow_null": True},
            "modifier_1": {"required": False},
            "modifier_2": {"required": False},
            "modifier_3": {"required": False},
            "modifier_4": {"required": False},
        }

    def validate_organization_item(self, value):
        facility = self.context.get("facility")
        if value and facility and value.organization_id != facility.organization_id:
            raise serializers.ValidationError(
                "Selected fee schedule item does not belong to this organization."
            )
        return value

    def validate_service_code(self, value):
        return (value or "").strip().upper()

    def create(self, validated_data):
        request = self.context.get("request")
        return FacilityFeeScheduleOverride.objects.create(
            facility=self.context["facility"],
            created_by=getattr(request, "user", None),
            updated_by=getattr(request, "user", None),
            **validated_data,
        )

    def update(self, instance, validated_data):
        request = self.context.get("request")
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.updated_by = getattr(request, "user", None)
        instance.save()
        return instance
