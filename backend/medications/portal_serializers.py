from rest_framework import serializers

from .models import Medication


class PortalMedicationSerializer(serializers.ModelSerializer):
    """Read-only medication record for the patient portal.

    Exposes prescriber name only as a display string; never surfaces the
    clinician User identifier or audit (``created_by``, ``updated_by``,
    ``*_by_name``) fields.
    """

    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Medication
        fields = [
            "id",
            "medication_name",
            "dose",
            "route",
            "frequency",
            "start_date",
            "end_date",
            "status",
            "status_label",
            "prescriber_name",
        ]
        read_only_fields = fields
