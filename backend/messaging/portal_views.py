"""Portal endpoints for the patient-facing secure messaging flow.

All endpoints are gated by :class:`IsPortalPatient` and scoped to the
requesting patient via :func:`get_patient_for_user`. Responses strip
clinician-side state (``unread_for_clinician``, ``sender_user``); writes
refuse cross-patient access with 404 to keep the existence surface
identical to the not-found surface.

Per D002 (portal reads/writes not audited), no ``record_audit_event``
calls live here.
"""

from django.db import transaction
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsPortalPatient
from users.portal_access import get_patient_for_user

from .models import Message, MessageThread
from .portal_serializers import (
    PortalMessageReplySerializer,
    PortalMessageSerializer,
    PortalMessageThreadCreateSerializer,
    PortalMessageThreadDetailSerializer,
    PortalMessageThreadListSerializer,
)


def _patient_display_name(patient):
    """Best-effort display name for a portal patient sender."""
    parts = [
        (patient.first_name or "").strip(),
        (patient.last_name or "").strip(),
    ]
    return " ".join(part for part in parts if part)


@extend_schema(
    responses=PortalMessageThreadListSerializer(many=True),
    summary="Patient portal message threads",
)
class MessageThreadListCreateView(APIView):
    """List or start the authenticated patient's message threads.

    GET returns the patient's own threads ordered by ``-last_message_at``.
    POST creates a new thread plus the first patient message inside one
    transaction; the response shape mirrors the detail endpoint.
    """

    permission_classes = [IsPortalPatient]

    def get(self, request):
        patient = get_patient_for_user(request.user)
        threads = (
            MessageThread.objects.filter(patient=patient)
            .prefetch_related("messages")
            .order_by("-last_message_at")
        )
        return Response(PortalMessageThreadListSerializer(threads, many=True).data)

    @extend_schema(
        request=PortalMessageThreadCreateSerializer,
        responses=PortalMessageThreadDetailSerializer,
    )
    def post(self, request):
        patient = get_patient_for_user(request.user)
        shape = PortalMessageThreadCreateSerializer(data=request.data)
        shape.is_valid(raise_exception=True)

        subject = shape.validated_data["subject"]
        body = shape.validated_data["body"]
        display_name = _patient_display_name(patient)

        with transaction.atomic():
            # Patient just sent the first message, so the thread is
            # already read for the patient and unread for the clinician.
            thread = MessageThread.objects.create(
                facility=patient.facility,
                patient=patient,
                subject=subject,
                status=MessageThread.STATUS_OPEN,
                unread_for_clinician=True,
                unread_for_patient=False,
            )
            # ``Message.save`` bumps ``last_message_at`` and re-flips
            # ``unread_for_clinician`` to True (already True; no-op).
            Message.objects.create(
                thread=thread,
                sender_kind=Message.SENDER_PATIENT,
                sender_user=request.user,
                sender_display_name=display_name,
                body=body,
            )

        thread.refresh_from_db()
        return Response(
            PortalMessageThreadDetailSerializer(thread).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    responses=PortalMessageThreadDetailSerializer,
    summary="Patient portal message thread detail",
)
class MessageThreadDetailView(APIView):
    """Return the full thread + messages for the requesting patient.

    Side effect: if the thread was unread for the patient, this view
    flips ``unread_for_patient`` to ``False`` (using ``update_fields`` so
    no other thread state is touched). 404 if the thread belongs to a
    different patient — we keep the not-yours surface identical to the
    doesn't-exist surface.
    """

    permission_classes = [IsPortalPatient]

    def get(self, request, pk):
        patient = get_patient_for_user(request.user)
        thread = get_object_or_404(
            MessageThread.objects.prefetch_related("messages"),
            pk=pk,
            patient=patient,
        )

        if thread.unread_for_patient:
            thread.unread_for_patient = False
            thread.save(update_fields=["unread_for_patient"])

        return Response(PortalMessageThreadDetailSerializer(thread).data)


@extend_schema(
    request=PortalMessageReplySerializer,
    responses=PortalMessageSerializer,
    summary="Reply to a patient portal message thread",
)
class MessageThreadReplyView(APIView):
    """Append a patient reply to an open thread.

    * 404 if the thread isn't owned by the requesting patient.
    * 400 if the thread is closed — patients cannot reopen closed
      threads from the portal (clinician-only action per product).
    * 400 if the body is empty or exceeds 4000 characters.

    On success the model's ``Message.save`` flips
    ``unread_for_clinician=True`` and bumps ``last_message_at``.
    """

    permission_classes = [IsPortalPatient]

    def post(self, request, pk):
        patient = get_patient_for_user(request.user)
        thread = MessageThread.objects.filter(pk=pk, patient=patient).first()
        if not thread:
            raise NotFound("Message thread not found.")
        if thread.status == MessageThread.STATUS_CLOSED:
            raise ValidationError(
                {"status": "This thread is closed and cannot accept replies."}
            )

        shape = PortalMessageReplySerializer(data=request.data)
        shape.is_valid(raise_exception=True)

        message = Message.objects.create(
            thread=thread,
            sender_kind=Message.SENDER_PATIENT,
            sender_user=request.user,
            sender_display_name=_patient_display_name(patient),
            body=shape.validated_data["body"],
        )
        return Response(
            PortalMessageSerializer(message).data,
            status=status.HTTP_201_CREATED,
        )
