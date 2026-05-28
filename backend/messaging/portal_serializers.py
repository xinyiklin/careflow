"""Patient-portal serializers for secure messaging.

These serializers strictly omit clinician-side state. In particular:

* ``unread_for_clinician`` is never serialized — that flag is for the
  staff inbox and would leak read-receipt timing to the patient.
* ``sender_user`` is never serialized — only the display name and the
  sender kind cross the wire, so the FK pointing at the underlying staff
  member never reaches the portal.
"""

from rest_framework import serializers

from .models import Message, MessageThread

SUBJECT_MAX_LENGTH = 150
BODY_MAX_LENGTH = 4000
PREVIEW_MAX_LENGTH = 120


class PortalMessageSerializer(serializers.ModelSerializer):
    """Read shape for a single message inside a thread detail payload."""

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


class PortalMessageThreadListSerializer(serializers.ModelSerializer):
    """Read shape for ``GET /v1/portal/messaging/threads/``.

    Includes a short ``last_message_preview`` so the inbox can show a
    snippet without a second round-trip. ``unread_for_clinician`` is
    intentionally excluded.
    """

    status_label = serializers.CharField(source="get_status_display", read_only=True)
    last_message_preview = serializers.SerializerMethodField()

    class Meta:
        model = MessageThread
        fields = [
            "id",
            "subject",
            "status",
            "status_label",
            "last_message_at",
            "unread_for_patient",
            "last_message_preview",
        ]
        read_only_fields = fields

    def get_last_message_preview(self, obj):
        # Threads always have at least one message after the create flow,
        # but defensively handle the empty case so a malformed fixture
        # doesn't 500 the inbox.
        last = obj.messages.order_by("-created_at").first()
        if not last:
            return ""
        body = last.body or ""
        if len(body) <= PREVIEW_MAX_LENGTH:
            return body
        return body[:PREVIEW_MAX_LENGTH]


class PortalMessageThreadDetailSerializer(serializers.ModelSerializer):
    """Read shape for ``GET /v1/portal/messaging/threads/<id>/``.

    Same thread fields as the list serializer (minus the preview) plus a
    full ``messages`` array ordered ascending so the UI can render the
    conversation top-to-bottom.
    """

    status_label = serializers.CharField(source="get_status_display", read_only=True)
    messages = serializers.SerializerMethodField()

    class Meta:
        model = MessageThread
        fields = [
            "id",
            "subject",
            "status",
            "status_label",
            "last_message_at",
            "unread_for_patient",
            "messages",
        ]
        read_only_fields = fields

    def get_messages(self, obj):
        # ``Message.Meta.ordering`` is ``created_at`` ascending, which is
        # the order we want for rendering the conversation.
        queryset = obj.messages.all()
        return PortalMessageSerializer(queryset, many=True).data


class PortalMessageThreadCreateSerializer(serializers.Serializer):
    """Write shape for ``POST /v1/portal/messaging/threads/``.

    Both subject and body must be present and non-blank after trimming.
    Length caps mirror the model fields (``subject`` <= 150) and an
    enforced ``body`` cap of 4000 characters.
    """

    subject = serializers.CharField(max_length=SUBJECT_MAX_LENGTH)
    body = serializers.CharField(max_length=BODY_MAX_LENGTH)

    def validate_subject(self, value):
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Subject cannot be blank.")
        return trimmed

    def validate_body(self, value):
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Body cannot be blank.")
        return trimmed


class PortalMessageReplySerializer(serializers.Serializer):
    """Write shape for ``POST /v1/portal/messaging/threads/<id>/reply/``."""

    body = serializers.CharField(max_length=BODY_MAX_LENGTH)

    def validate_body(self, value):
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Body cannot be blank.")
        return trimmed
