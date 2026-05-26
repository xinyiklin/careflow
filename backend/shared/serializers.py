from collections.abc import Mapping

from rest_framework import serializers

from .models import Address


class StrictPayloadMixin:
    """Reject unknown and read-only fields on write requests.

    Fail-fast guard for catching misnamed payload keys instead of silently
    dropping them. Composed with ``ModelSerializer`` ahead of the base class.
    """

    def to_internal_value(self, data):
        if isinstance(data, Mapping):
            supplied_fields = set(data.keys())
            known_fields = set(self.fields.keys())
            unknown_fields = supplied_fields - known_fields
            if unknown_fields:
                raise serializers.ValidationError(
                    {field: ["Unknown field."] for field in sorted(unknown_fields)}
                )

            read_only_fields = {
                name for name, field in self.fields.items() if field.read_only
            }
            supplied_read_only_fields = supplied_fields & read_only_fields
            if supplied_read_only_fields:
                raise serializers.ValidationError(
                    {
                        field: ["This field is read-only."]
                        for field in sorted(supplied_read_only_fields)
                    }
                )

        return super().to_internal_value(data)


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            "id",
            "line_1",
            "line_2",
            "city",
            "state",
            "zip_code",
        ]
