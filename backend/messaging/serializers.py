"""Clinician-side serializers for secure messaging.

These mirror the medications app's read/action split: a list serializer
for the inbox row shape, a detail serializer that surfaces the full
messages array, and an input-only serializer for the ``reply`` action.

The clinician surface intentionally exposes ``unread_for_clinician``
(this side of the inbox cares about it) while still scrubbing
``sender_user`` from individual messages — message authorship is only
shown via ``sender_display_name`` and ``sender_kind``.
"""

from rest_framework import serializers

from shared.serializers import StrictPayloadMixin

from .models import Message, MessageThread

BODY_MAX_LENGTH = 4000


class MessageSerializer(serializers.ModelSerializer):
    """Read shape for a single message inside a thread detail payload.

    Mirrors the portal message serializer's field list so the clinician
    UI doesn't accidentally receive a different shape: ``sender_user``
    is omitted on purpose — only ``sender_display_name`` and
    ``sender_kind`` cross the wire.
    """

    class Meta:
        model = Message
        fields = [
            "id",
            "sender_kind",
            "sender_display_name",
            "body",
            "created_at",
        ]
        read_only_fields = fields


class MessageThreadListSerializer(serializers.ModelSerializer):
    """Read shape for ``GET /v1/messaging/threads/`` (clinician inbox).

    Surfaces ``unread_for_clinician`` (this is the clinician side, so
    that flag is fair game) plus a denormalized patient display name so
    the inbox table doesn't need a second round-trip.
    """

    patient_id = serializers.IntegerField(source="patient.id", read_only=True)
    patient_display_name = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = MessageThread
        fields = [
            "id",
            "patient_id",
            "patient_display_name",
            "subject",
            "status",
            "status_label",
            "last_message_at",
            "unread_for_clinician",
        ]
        read_only_fields = fields

    def get_patient_display_name(self, obj):
        return f"{obj.patient.last_name}, {obj.patient.first_name}"


class MessageThreadDetailSerializer(serializers.ModelSerializer):
    """Read shape for ``GET /v1/messaging/threads/<id>/``.

    Adds the full ``messages`` array (ascending by ``created_at``, the
    model's default ordering) so the clinician conversation pane can
    render top-to-bottom without a second request.
    """

    patient_id = serializers.IntegerField(source="patient.id", read_only=True)
    patient_display_name = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    messages = serializers.SerializerMethodField()

    class Meta:
        model = MessageThread
        fields = [
            "id",
            "patient_id",
            "patient_display_name",
            "subject",
            "status",
            "status_label",
            "last_message_at",
            "unread_for_clinician",
            "messages",
        ]
        read_only_fields = fields

    def get_patient_display_name(self, obj):
        return f"{obj.patient.last_name}, {obj.patient.first_name}"

    def get_messages(self, obj):
        # ``Message.Meta.ordering`` is ``created_at`` ascending — the
        # exact order we want for the conversation pane.
        return MessageSerializer(obj.messages.all(), many=True).data


class MessageReplyInputSerializer(StrictPayloadMixin, serializers.Serializer):
    """Write shape for ``POST /v1/messaging/threads/<id>/reply/``.

    Mirrors ``RefillRequestActionSerializer``: action input is its own
    tiny serializer separate from the read shape. Body cap matches the
    portal serializer so clinician replies and patient replies share
    one limit.
    """

    body = serializers.CharField(max_length=BODY_MAX_LENGTH)

    def validate_body(self, value):
        trimmed = (value or "").strip()
        if not trimmed:
            raise serializers.ValidationError("Body cannot be blank.")
        return trimmed
