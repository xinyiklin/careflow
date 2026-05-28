"""Clinician viewset for managing secure-message threads.

Mirrors ``RefillRequestViewSet`` in shape: list + detail + custom
detail actions (``reply``, ``close``, ``reopen``). Patient-initiated
thread creation lives on the portal viewset — this surface deliberately
omits ``CreateModelMixin`` and pins ``http_method_names`` so a
``POST /v1/messaging/threads/`` request comes back as 405.

Every mutation (and the detail read, since opening a thread flips the
clinician-unread flag) records an audit event so the clinical timeline
captures who-saw-what and who-replied-when.
"""

from django.db import transaction
from django.db.models import Q
from rest_framework import mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from audit.services import record_audit_event
from facilities.security import user_has_facility_permission
from patients.models import Patient
from shared.scoping import FacilityScopedViewSetMixin

from .models import Message, MessageThread
from .serializers import (
    MessageReplyInputSerializer,
    MessageSerializer,
    MessageThreadDetailSerializer,
    MessageThreadListSerializer,
)


class MessageThreadViewSet(
    FacilityScopedViewSetMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Clinician-side list/detail/reply/close/reopen for message threads.

    Reads (list + detail) are gated on ``messaging.view``; mutations
    (``reply`` / ``close`` / ``reopen``) require ``messaging.respond``.
    Thread creation is patient-initiated — there is no clinician create
    route, so we explicitly omit :class:`mixins.CreateModelMixin` and
    constrain ``http_method_names`` so the collection-level POST falls
    through to a 405 instead of being swallowed by an action route.
    """

    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return MessageThreadDetailSerializer
        return MessageThreadListSerializer

    def get_queryset(self):
        facility = self._require_permission(
            "messaging.view",
            "You do not have access to view messages.",
        )
        queryset = (
            MessageThread.objects.filter(facility=facility)
            .select_related("patient", "facility")
            .order_by("-last_message_at")
        )

        patient_id = self.parse_positive_int_query_param("patient_id")
        status_value = self.request.query_params.get("status")
        search = (self.request.query_params.get("search") or "").strip()

        if patient_id:
            self._ensure_patient_is_in_facility(patient_id, facility)
            queryset = queryset.filter(patient_id=patient_id)
        if status_value:
            valid_statuses = {choice[0] for choice in MessageThread.STATUS_CHOICES}
            if status_value not in valid_statuses:
                raise ValidationError(
                    {"status": ["Unsupported message thread status."]}
                )
            queryset = queryset.filter(status=status_value)
        if search:
            queryset = queryset.filter(
                Q(subject__icontains=search)
                | Q(patient__first_name__icontains=search)
                | Q(patient__last_name__icontains=search)
            )

        return queryset

    # Note: no ``get_object`` override. Cross-facility threads are
    # surfaced as 404 — message threads are workflow items, not
    # first-class resources, so we don't leak existence via a 403
    # sentinel. Mirrors the refill viewset's policy.

    def retrieve(self, request, *args, **kwargs):
        thread = self.get_object()
        facility = self.get_facility()

        if thread.unread_for_clinician:
            thread.unread_for_clinician = False
            thread.save(update_fields=["unread_for_clinician"])

        record_audit_event(
            actor=request.user,
            facility=facility,
            patient=thread.patient,
            action="view",
            app_label="messaging",
            model_name="messagethread",
            object_pk=thread.pk,
            summary=(
                f"Viewed thread {thread.id} for "
                f"{thread.patient.last_name}, {thread.patient.first_name}"
            ),
        )
        return Response(self.get_serializer(thread).data)

    @action(detail=True, methods=["post"])
    def reply(self, request, pk=None):
        facility = self._require_permission(
            "messaging.respond",
            "You do not have access to respond to messages.",
        )
        thread = self.get_object()
        if thread.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this thread.")
        if thread.status == MessageThread.STATUS_CLOSED:
            raise ValidationError(
                {"status": "This thread is closed and cannot accept replies."}
            )

        shape = MessageReplyInputSerializer(data=request.data)
        shape.is_valid(raise_exception=True)

        with transaction.atomic():
            message = Message.objects.create(
                thread=thread,
                sender_kind=Message.SENDER_CLINICIAN,
                sender_user=request.user,
                sender_display_name=f"Care Team at {thread.facility.name}",
                body=shape.validated_data["body"],
            )
            record_audit_event(
                actor=request.user,
                facility=facility,
                patient=thread.patient,
                action="update",
                app_label="messaging",
                model_name="messagethread",
                object_pk=thread.pk,
                summary=(
                    f"Replied to thread {thread.id} for "
                    f"{thread.patient.last_name}, {thread.patient.first_name}"
                ),
                metadata={"message_id": message.id},
            )

        return Response(
            MessageSerializer(message).data,
            status=201,
        )

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        return self._set_status(
            request,
            new_status=MessageThread.STATUS_CLOSED,
            already_message="Thread is already closed.",
            audit_summary_prefix="Closed thread",
        )

    @action(detail=True, methods=["post"])
    def reopen(self, request, pk=None):
        return self._set_status(
            request,
            new_status=MessageThread.STATUS_OPEN,
            already_message="Thread is already open.",
            audit_summary_prefix="Reopened thread",
        )

    def _set_status(
        self, request, *, new_status, already_message, audit_summary_prefix
    ):
        facility = self._require_permission(
            "messaging.respond",
            "You do not have access to respond to messages.",
        )
        thread = self.get_object()
        if thread.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this thread.")
        if thread.status == new_status:
            raise ValidationError({"status": already_message})

        with transaction.atomic():
            thread.status = new_status
            thread.save(update_fields=["status"])
            record_audit_event(
                actor=request.user,
                facility=facility,
                patient=thread.patient,
                action="update",
                app_label="messaging",
                model_name="messagethread",
                object_pk=thread.pk,
                summary=(
                    f"{audit_summary_prefix} {thread.id} for "
                    f"{thread.patient.last_name}, {thread.patient.first_name}"
                ),
                metadata={"status": thread.status},
            )

        return Response(MessageThreadListSerializer(thread).data)

    def _require_permission(self, permission, message):
        facility = self.get_facility()
        if not user_has_facility_permission(
            self.request.user,
            facility.id,
            permission,
        ):
            raise PermissionDenied(message)
        return facility

    def _ensure_patient_is_in_facility(self, patient_id, facility):
        patient = Patient.objects.filter(pk=patient_id).only("facility_id").first()
        if patient and patient.facility_id != facility.id:
            raise PermissionDenied("You do not have access to this patient.")
