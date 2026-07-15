"""Integration tests for the clinician message-thread viewset.

Covers ``/v1/messaging/threads/`` (list + detail) and the
``reply`` / ``close`` / ``reopen`` detail actions. All endpoints are
gated by ``FacilityScopedViewSetMixin`` and the ``messaging.view`` /
``messaging.respond`` security permissions. Patient-initiated thread
creation lives on the portal viewset and is covered in
``tests_portal.py``.
"""

from datetime import date
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APITestCase

from audit.models import AuditEvent
from facilities.models import Facility, Staff, StaffRole
from organizations.models import Organization, OrganizationMembership
from patients.models import Patient

from .models import Message, MessageThread
from .views import MessageThreadViewSet

User = get_user_model()


THREADS_URL = "/v1/messaging/threads/"


def _thread_detail_url(pk):
    return f"/v1/messaging/threads/{pk}/"


def _thread_reply_url(pk):
    return f"/v1/messaging/threads/{pk}/reply/"


def _thread_close_url(pk):
    return f"/v1/messaging/threads/{pk}/close/"


def _thread_reopen_url(pk):
    return f"/v1/messaging/threads/{pk}/reopen/"


class ClinicianMessagingBaseMixin:
    """Two facilities, a clinician with respond perms in facility A, a
    second clinician in facility B, plus one patient per facility.

    Mirrors :class:`ClinicianRefillBaseMixin` so the two clinician test
    suites read the same way.
    """

    def setUp(self):
        super().setUp()
        self.organization = Organization.objects.create(
            name="Messaging Clinician Org", slug="messaging-clinician-org"
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Messaging Clinician Clinic",
            timezone="America/New_York",
        )
        self.other_facility = Facility.objects.create(
            organization=self.organization,
            name="Other Messaging Clinic",
            timezone="America/New_York",
        )

        # Clinician at facility A — physician (messaging.respond).
        self.clinician = self._make_clinician(
            "clinician_a", self.facility, role_code="physician", is_default=True
        )
        # Clinician at facility B — also physician.
        self.clinician_other = self._make_clinician(
            "clinician_b",
            self.other_facility,
            role_code="physician",
            is_default=True,
        )

        gender_a = self.facility.patient_genders.first()
        gender_b = self.other_facility.patient_genders.first()
        self.patient = Patient.objects.create(
            facility=self.facility,
            first_name="Alice",
            last_name="Anderson",
            date_of_birth=date(1980, 1, 1),
            gender=gender_a,
        )
        self.patient_other = Patient.objects.create(
            facility=self.other_facility,
            first_name="Bob",
            last_name="Brown",
            date_of_birth=date(1985, 2, 2),
            gender=gender_b,
        )

    def _make_clinician(self, username, facility, *, role_code, is_default=False):
        user = User.objects.create_user(
            username=username,
            password="testpass123",
            email=f"{username}@example.com",
        )
        OrganizationMembership.objects.create(
            user=user,
            organization=self.organization,
            role=OrganizationMembership.ROLE_MEMBER,
            is_active=True,
        )
        Staff.objects.create(
            user=user,
            facility=facility,
            role=StaffRole.objects.get(facility=facility, code=role_code),
            is_active=True,
            is_default=is_default,
        )
        return user

    def _make_view_only_clinician(self):
        """Build a clinician with ``messaging.view`` but NOT ``messaging.respond``.

        The default ``staff`` role grants ``messaging.respond`` per the
        security template, so we mint a fresh role with that flag cleared
        and the view flag preserved.
        """
        user = User.objects.create_user(
            username="view_only_msg",
            password="testpass123",
            email="view_only_msg@example.com",
        )
        OrganizationMembership.objects.create(
            user=user,
            organization=self.organization,
            role=OrganizationMembership.ROLE_MEMBER,
            is_active=True,
        )
        base_template = dict(
            StaffRole.objects.get(
                facility=self.facility, code="staff"
            ).security_permissions
        )
        base_template["messaging.view"] = True
        base_template["messaging.respond"] = False
        view_only_role = StaffRole.objects.create(
            facility=self.facility,
            code="msg_view_only",
            name="Messaging View Only",
            security_permissions=base_template,
        )
        Staff.objects.create(
            user=user,
            facility=self.facility,
            role=view_only_role,
            is_active=True,
            is_default=True,
        )
        return user

    def _make_no_view_clinician(self):
        """Build a clinician with NEITHER ``messaging.view`` nor ``messaging.respond``."""
        user = User.objects.create_user(
            username="no_msg_perms",
            password="testpass123",
            email="no_msg_perms@example.com",
        )
        OrganizationMembership.objects.create(
            user=user,
            organization=self.organization,
            role=OrganizationMembership.ROLE_MEMBER,
            is_active=True,
        )
        base_template = dict(
            StaffRole.objects.get(
                facility=self.facility, code="staff"
            ).security_permissions
        )
        base_template["messaging.view"] = False
        base_template["messaging.respond"] = False
        role = StaffRole.objects.create(
            facility=self.facility,
            code="msg_no_perms",
            name="No Messaging Perms",
            security_permissions=base_template,
        )
        Staff.objects.create(
            user=user,
            facility=self.facility,
            role=role,
            is_active=True,
            is_default=True,
        )
        return user

    def _make_thread(
        self,
        patient,
        *,
        subject="Subject",
        status_value=MessageThread.STATUS_OPEN,
        unread_for_clinician=True,
        unread_for_patient=False,
    ):
        return MessageThread.objects.create(
            facility=patient.facility,
            patient=patient,
            subject=subject,
            status=status_value,
            unread_for_clinician=unread_for_clinician,
            unread_for_patient=unread_for_patient,
        )

    def _make_patient_message(self, thread, body="Hello"):
        return Message.objects.create(
            thread=thread,
            sender_kind=Message.SENDER_PATIENT,
            sender_display_name="Patient",
            body=body,
        )


class ClinicianMessagingAuthAndListTests(ClinicianMessagingBaseMixin, APITestCase):
    def test_anonymous_returns_401(self):
        response = self.client.get(THREADS_URL)
        self.assertEqual(response.status_code, 401)

    def test_without_messaging_view_list_returns_403(self):
        self.client.force_authenticate(self._make_no_view_clinician())
        response = self.client.get(THREADS_URL)
        self.assertEqual(response.status_code, 403)

    def test_without_messaging_view_detail_returns_403(self):
        thread = self._make_thread(self.patient)
        self.client.force_authenticate(self._make_no_view_clinician())
        response = self.client.get(_thread_detail_url(thread.id))
        self.assertEqual(response.status_code, 403)

    def test_cross_facility_thread_is_hidden_from_list(self):
        own = self._make_thread(self.patient, subject="Mine")
        self._make_thread(self.patient_other, subject="Theirs")

        self.client.force_authenticate(self.clinician)
        response = self.client.get(THREADS_URL)
        self.assertEqual(response.status_code, 200, response.data)
        ids = [row["id"] for row in response.json()]
        self.assertEqual(ids, [own.id])

    def test_list_filter_by_status_open(self):
        open_thread = self._make_thread(self.patient, subject="Open one")
        self._make_thread(
            self.patient,
            subject="Closed one",
            status_value=MessageThread.STATUS_CLOSED,
        )

        self.client.force_authenticate(self.clinician)
        response = self.client.get(THREADS_URL, {"status": "open"})
        self.assertEqual(response.status_code, 200)
        ids = [row["id"] for row in response.json()]
        self.assertEqual(ids, [open_thread.id])

    def test_list_filter_by_patient_id(self):
        sibling = Patient.objects.create(
            facility=self.facility,
            first_name="Carol",
            last_name="Cooper",
            date_of_birth=date(1975, 5, 5),
            gender=self.facility.patient_genders.first(),
        )
        own = self._make_thread(self.patient, subject="Alice")
        self._make_thread(sibling, subject="Carol")

        self.client.force_authenticate(self.clinician)
        response = self.client.get(THREADS_URL, {"patient_id": self.patient.id})
        self.assertEqual(response.status_code, 200)
        ids = [row["id"] for row in response.json()]
        self.assertEqual(ids, [own.id])

    def test_list_filter_by_search_matches_subject_and_name(self):
        sibling = Patient.objects.create(
            facility=self.facility,
            first_name="Zelda",
            last_name="Zephyr",
            date_of_birth=date(1990, 9, 9),
            gender=self.facility.patient_genders.first(),
        )
        subject_match = self._make_thread(
            self.patient, subject="Lab follow-up question"
        )
        name_match = self._make_thread(sibling, subject="General inquiry")
        # Neither subject nor patient name contains 'zelda' or
        # 'follow-up' — should be excluded.
        self._make_thread(self.patient, subject="Routine note")

        self.client.force_authenticate(self.clinician)
        # Subject substring match.
        response = self.client.get(THREADS_URL, {"search": "follow-up"})
        self.assertEqual(response.status_code, 200)
        ids = {row["id"] for row in response.json()}
        self.assertEqual(ids, {subject_match.id})

        # Patient first-name substring match.
        response = self.client.get(THREADS_URL, {"search": "zelda"})
        self.assertEqual(response.status_code, 200)
        ids = {row["id"] for row in response.json()}
        self.assertEqual(ids, {name_match.id})

    def test_list_payload_includes_unread_for_clinician(self):
        self._make_thread(self.patient, subject="Vis", unread_for_clinician=True)

        self.client.force_authenticate(self.clinician)
        response = self.client.get(THREADS_URL)
        self.assertEqual(response.status_code, 200)
        rows = response.json()
        self.assertEqual(len(rows), 1)
        row = rows[0]
        # Clinician side: the unread flag IS exposed here (unlike on
        # the portal). And patient context surfaces too.
        self.assertIn("unread_for_clinician", row)
        self.assertEqual(row["unread_for_clinician"], True)
        self.assertEqual(row["patient_id"], self.patient.id)
        self.assertEqual(row["patient_display_name"], "Anderson, Alice")
        self.assertEqual(row["status"], "open")
        self.assertEqual(row["status_label"], "Open")

    def test_no_create_route(self):
        """``POST /v1/messaging/threads/`` must return 405 — thread
        creation is patient-initiated only."""
        self.client.force_authenticate(self.clinician)
        response = self.client.post(
            THREADS_URL,
            {"subject": "Should not work", "body": "Nope"},
            format="json",
        )
        self.assertEqual(response.status_code, 405)


class ClinicianMessagingDetailTests(ClinicianMessagingBaseMixin, APITestCase):
    def test_detail_flips_unread_and_records_audit(self):
        thread = self._make_thread(
            self.patient, subject="Detail", unread_for_clinician=True
        )
        m1 = self._make_patient_message(thread, body="Hi from patient")

        self.client.force_authenticate(self.clinician)
        response = self.client.get(_thread_detail_url(thread.id))
        self.assertEqual(response.status_code, 200, response.data)

        body = response.json()
        self.assertEqual(body["id"], thread.id)
        self.assertEqual(body["subject"], "Detail")
        self.assertEqual(body["patient_id"], self.patient.id)
        self.assertEqual(body["patient_display_name"], "Anderson, Alice")
        # Clinician side surfaces the unread flag.
        self.assertIn("unread_for_clinician", body)

        # Messages embedded — must NEVER leak ``sender_user``.
        messages = body["messages"]
        self.assertEqual([m["id"] for m in messages], [m1.id])
        for msg in messages:
            self.assertNotIn("sender_user", msg)
            self.assertIn("sender_kind", msg)
            self.assertIn("sender_display_name", msg)
            self.assertIn("body", msg)
            self.assertIn("created_at", msg)

        # Side effect: clinician unread flag cleared.
        thread.refresh_from_db()
        self.assertFalse(thread.unread_for_clinician)

        # Audit row recorded.
        audit_event = AuditEvent.objects.filter(
            actor=self.clinician,
            action="view",
            app_label="messaging",
            model_name="messagethread",
            object_pk=str(thread.pk),
        ).first()
        self.assertIsNotNone(audit_event)
        self.assertIn(f"Viewed thread {thread.id}", audit_event.summary)
        self.assertEqual(audit_event.facility_id, self.facility.id)
        self.assertEqual(audit_event.patient_id, self.patient.id)

    def test_detail_cross_facility_returns_404(self):
        thread = self._make_thread(self.patient_other, subject="Other")
        self.client.force_authenticate(self.clinician)
        response = self.client.get(_thread_detail_url(thread.id))
        self.assertEqual(response.status_code, 404)


class ClinicianMessagingReplyTests(ClinicianMessagingBaseMixin, APITestCase):
    def test_reply_without_respond_permission_returns_403(self):
        thread = self._make_thread(self.patient)
        self._make_patient_message(thread)
        self.client.force_authenticate(self._make_view_only_clinician())

        response = self.client.post(
            _thread_reply_url(thread.id), {"body": "Hi"}, format="json"
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(thread.messages.count(), 1)

    def test_reply_on_open_thread_returns_201(self):
        thread = self._make_thread(self.patient)
        self._make_patient_message(thread)
        # Simulate previous open + read state.
        MessageThread.objects.filter(pk=thread.pk).update(unread_for_clinician=False)

        self.client.force_authenticate(self.clinician)
        with CaptureQueriesContext(connection) as queries:
            response = self.client.post(
                _thread_reply_url(thread.id),
                {"body": "Thanks for reaching out."},
                format="json",
            )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(
            any(
                '"messaging_messagethread"' in query["sql"]
                and "FOR UPDATE" in query["sql"].upper()
                for query in queries
            ),
            "Replies must lock the thread row before checking its state.",
        )
        body = response.json()
        self.assertEqual(body["sender_kind"], Message.SENDER_CLINICIAN)
        self.assertEqual(
            body["sender_display_name"],
            f"Care Team at {self.facility.name}",
        )
        self.assertEqual(body["body"], "Thanks for reaching out.")
        # Never expose ``sender_user``.
        self.assertNotIn("sender_user", body)

        # DB invariants on the new message.
        new_message = Message.objects.get(pk=body["id"])
        self.assertEqual(new_message.sender_kind, Message.SENDER_CLINICIAN)
        self.assertEqual(
            new_message.sender_display_name,
            f"Care Team at {self.facility.name}",
        )
        self.assertEqual(new_message.sender_user_id, self.clinician.id)
        self.assertEqual(new_message.thread_id, thread.id)

        # Thread side effects: ``Message.save`` flips patient-unread
        # and bumps ``last_message_at``.
        thread.refresh_from_db()
        self.assertTrue(thread.unread_for_patient)
        self.assertEqual(thread.messages.count(), 2)

        # Audit row recorded.
        audit_event = AuditEvent.objects.filter(
            actor=self.clinician,
            action="update",
            app_label="messaging",
            model_name="messagethread",
            object_pk=str(thread.pk),
            summary__startswith="Replied to thread",
        ).first()
        self.assertIsNotNone(audit_event)
        self.assertIn(f"Replied to thread {thread.id}", audit_event.summary)
        self.assertEqual(audit_event.facility_id, self.facility.id)
        self.assertEqual(audit_event.patient_id, self.patient.id)
        self.assertEqual(audit_event.metadata.get("message_id"), new_message.id)

    def test_reply_on_closed_thread_returns_400(self):
        thread = self._make_thread(
            self.patient, status_value=MessageThread.STATUS_CLOSED
        )
        self._make_patient_message(thread)
        self.client.force_authenticate(self.clinician)
        response = self.client.post(
            _thread_reply_url(thread.id), {"body": "Still here"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("status", response.json())
        self.assertEqual(thread.messages.count(), 1)

    def test_reply_rereads_thread_state_instead_of_using_a_stale_object(self):
        thread = self._make_thread(self.patient)
        self._make_patient_message(thread)
        stale_open_thread = MessageThread.objects.get(pk=thread.pk)
        MessageThread.objects.filter(pk=thread.pk).update(
            status=MessageThread.STATUS_CLOSED
        )

        self.client.force_authenticate(self.clinician)
        with patch.object(
            MessageThreadViewSet,
            "get_object",
            return_value=stale_open_thread,
        ):
            response = self.client.post(
                _thread_reply_url(thread.id),
                {"body": "This must not land after close."},
                format="json",
            )

        self.assertEqual(response.status_code, 400)
        self.assertIn("status", response.json())
        self.assertEqual(thread.messages.count(), 1)

    def test_reply_with_empty_body_returns_400(self):
        thread = self._make_thread(self.patient)
        self._make_patient_message(thread)
        self.client.force_authenticate(self.clinician)
        response = self.client.post(
            _thread_reply_url(thread.id), {"body": "   "}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("body", response.json())
        self.assertEqual(thread.messages.count(), 1)

    def test_reply_with_body_over_4000_chars_returns_400(self):
        thread = self._make_thread(self.patient)
        self._make_patient_message(thread)
        self.client.force_authenticate(self.clinician)
        response = self.client.post(
            _thread_reply_url(thread.id), {"body": "x" * 4001}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("body", response.json())
        self.assertEqual(thread.messages.count(), 1)

    def test_reply_cross_facility_returns_404(self):
        thread = self._make_thread(self.patient_other)
        self._make_patient_message(thread)
        self.client.force_authenticate(self.clinician)
        response = self.client.post(
            _thread_reply_url(thread.id), {"body": "Nosy"}, format="json"
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(thread.messages.count(), 1)


class ClinicianMessagingCloseTests(ClinicianMessagingBaseMixin, APITestCase):
    def test_close_without_respond_permission_returns_403(self):
        thread = self._make_thread(self.patient)
        self.client.force_authenticate(self._make_view_only_clinician())
        response = self.client.post(_thread_close_url(thread.id), {}, format="json")
        self.assertEqual(response.status_code, 403)
        thread.refresh_from_db()
        self.assertEqual(thread.status, MessageThread.STATUS_OPEN)

    def test_close_open_thread_returns_200_and_records_audit(self):
        thread = self._make_thread(self.patient)
        self.client.force_authenticate(self.clinician)
        with CaptureQueriesContext(connection) as queries:
            response = self.client.post(_thread_close_url(thread.id), {}, format="json")

        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(
            any(
                '"messaging_messagethread"' in query["sql"]
                and "FOR UPDATE" in query["sql"].upper()
                for query in queries
            ),
            "Close must lock the thread row before checking its state.",
        )
        body = response.json()
        self.assertEqual(body["status"], "closed")
        self.assertEqual(body["status_label"], "Closed")
        self.assertEqual(body["id"], thread.id)

        thread.refresh_from_db()
        self.assertEqual(thread.status, MessageThread.STATUS_CLOSED)

        audit_event = AuditEvent.objects.filter(
            actor=self.clinician,
            action="update",
            app_label="messaging",
            model_name="messagethread",
            object_pk=str(thread.pk),
            summary__startswith="Closed thread",
        ).first()
        self.assertIsNotNone(audit_event)
        self.assertEqual(audit_event.metadata.get("status"), "closed")
        self.assertEqual(audit_event.facility_id, self.facility.id)
        self.assertEqual(audit_event.patient_id, self.patient.id)

    def test_close_already_closed_returns_400(self):
        thread = self._make_thread(
            self.patient, status_value=MessageThread.STATUS_CLOSED
        )
        self.client.force_authenticate(self.clinician)
        response = self.client.post(_thread_close_url(thread.id), {}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("status", response.json())

    def test_close_rereads_thread_state_instead_of_using_a_stale_object(self):
        thread = self._make_thread(self.patient)
        stale_open_thread = MessageThread.objects.get(pk=thread.pk)
        MessageThread.objects.filter(pk=thread.pk).update(
            status=MessageThread.STATUS_CLOSED
        )

        self.client.force_authenticate(self.clinician)
        with patch.object(
            MessageThreadViewSet,
            "get_object",
            return_value=stale_open_thread,
        ):
            response = self.client.post(_thread_close_url(thread.id), {}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("status", response.json())

    def test_close_cross_facility_returns_404(self):
        thread = self._make_thread(self.patient_other)
        self.client.force_authenticate(self.clinician)
        response = self.client.post(_thread_close_url(thread.id), {}, format="json")
        self.assertEqual(response.status_code, 404)
        thread.refresh_from_db()
        self.assertEqual(thread.status, MessageThread.STATUS_OPEN)


class ClinicianMessagingReopenTests(ClinicianMessagingBaseMixin, APITestCase):
    def test_reopen_without_respond_permission_returns_403(self):
        thread = self._make_thread(
            self.patient, status_value=MessageThread.STATUS_CLOSED
        )
        self.client.force_authenticate(self._make_view_only_clinician())
        response = self.client.post(_thread_reopen_url(thread.id), {}, format="json")
        self.assertEqual(response.status_code, 403)
        thread.refresh_from_db()
        self.assertEqual(thread.status, MessageThread.STATUS_CLOSED)

    def test_reopen_closed_thread_returns_200_and_records_audit(self):
        thread = self._make_thread(
            self.patient, status_value=MessageThread.STATUS_CLOSED
        )
        self.client.force_authenticate(self.clinician)
        with CaptureQueriesContext(connection) as queries:
            response = self.client.post(
                _thread_reopen_url(thread.id), {}, format="json"
            )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(
            any(
                '"messaging_messagethread"' in query["sql"]
                and "FOR UPDATE" in query["sql"].upper()
                for query in queries
            ),
            "Reopen must lock the thread row before checking its state.",
        )
        body = response.json()
        self.assertEqual(body["status"], "open")
        self.assertEqual(body["status_label"], "Open")

        thread.refresh_from_db()
        self.assertEqual(thread.status, MessageThread.STATUS_OPEN)

        audit_event = AuditEvent.objects.filter(
            actor=self.clinician,
            action="update",
            app_label="messaging",
            model_name="messagethread",
            object_pk=str(thread.pk),
            summary__startswith="Reopened thread",
        ).first()
        self.assertIsNotNone(audit_event)
        self.assertEqual(audit_event.metadata.get("status"), "open")
        self.assertEqual(audit_event.facility_id, self.facility.id)
        self.assertEqual(audit_event.patient_id, self.patient.id)

    def test_reopen_already_open_returns_400(self):
        thread = self._make_thread(self.patient)
        self.client.force_authenticate(self.clinician)
        response = self.client.post(_thread_reopen_url(thread.id), {}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("status", response.json())

    def test_reopen_rereads_thread_state_instead_of_using_a_stale_object(self):
        thread = self._make_thread(
            self.patient, status_value=MessageThread.STATUS_CLOSED
        )
        stale_closed_thread = MessageThread.objects.get(pk=thread.pk)
        MessageThread.objects.filter(pk=thread.pk).update(
            status=MessageThread.STATUS_OPEN
        )

        self.client.force_authenticate(self.clinician)
        with patch.object(
            MessageThreadViewSet,
            "get_object",
            return_value=stale_closed_thread,
        ):
            response = self.client.post(
                _thread_reopen_url(thread.id), {}, format="json"
            )

        self.assertEqual(response.status_code, 400)
        self.assertIn("status", response.json())

    def test_reopen_cross_facility_returns_404(self):
        thread = self._make_thread(
            self.patient_other, status_value=MessageThread.STATUS_CLOSED
        )
        self.client.force_authenticate(self.clinician)
        response = self.client.post(_thread_reopen_url(thread.id), {}, format="json")
        self.assertEqual(response.status_code, 404)
        thread.refresh_from_db()
        self.assertEqual(thread.status, MessageThread.STATUS_CLOSED)
