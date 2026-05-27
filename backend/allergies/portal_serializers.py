from rest_framework import serializers

from .models import PatientAllergy


class PortalAllergySerializer(serializers.ModelSerializer):
    """Read-only allergy record for the patient portal.

    Strips clinician audit fields (``created_by``, ``updated_by``) and the
    internal facility FK; surfaces only the fields the patient cares about.
    """

    category_label = serializers.CharField(
        source="get_category_display",
        read_only=True,
    )
    severity_label = serializers.CharField(
        source="get_severity_display",
        read_only=True,
    )
    status_label = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = PatientAllergy
        fields = [
            "id",
            "allergen",
            "category",
            "category_label",
            "reaction",
            "severity",
            "severity_label",
            "onset_date",
            "status",
            "status_label",
        ]
        read_only_fields = fields
