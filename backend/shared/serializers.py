from rest_framework import serializers

from .models import Address


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
