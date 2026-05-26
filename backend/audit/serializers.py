from rest_framework import serializers

from .models import AuditEvent


class AuditEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    facility_name = serializers.CharField(
        source="facility.name", read_only=True, default=""
    )
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditEvent
        fields = [
            "id",
            "actor_name",
            "facility_name",
            "patient_name",
            "action",
            "app_label",
            "model_name",
            "object_pk",
            "summary",
            "metadata",
            "created_at",
        ]
        read_only_fields = fields

    def get_actor_name(self, obj):
        if obj.actor:
            return obj.actor.get_full_name() or obj.actor.get_username()
        meta = obj.metadata or {}
        return meta.get("actor_name", "")

    def get_patient_name(self, obj):
        if obj.patient:
            return f"{obj.patient.last_name}, {obj.patient.first_name}"
        return ""
