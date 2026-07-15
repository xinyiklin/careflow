"""Integration tests for the patient-portal secure-messaging endpoints.

Covers all four ``/v1/portal/messaging/`` routes (list threads, start
thread, thread detail, reply). All endpoints are gated by
``IsPortalPatient`` and scoped to the requesting patient via
``get_patient_for_user``; responses must never leak
``unread_for_clinician`` or any ``sender_user`` reference.
"""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APITestCase

from facilities.models import Facility, Staff, StaffRole
from organizations.models import Organization, OrganizationMembership
from patients.models import Patient
from users.portal import PatientPortalAccount

from .models import Message, MessageThread

User = get_user_model()


THREADS_URL = "/v1/portal/messaging/threads/"


def _thread_detail_url(pk):
    return f"/v1/portal/messaging/threads/{pk}/"


def _thread_reply_url(pk):
    return f"/v1/portal/messaging/threads/{pk}/reply/"


class PortalMessagingBaseMixin:
    """Two patients (Alice + Bob) with portal accounts at the same facility.

    Mirrors the shape of ``PortalRefillBaseMixin`` (one facility, two
    patients, helpers for a clinician user and an inactive portal
    account). Messaging doesn't need cross-facility pharmacies, so we
    keep the fixture leaner.
    """

    def setUp(self):
        super().setUp()
        self.organization = Organization.objects.create(
            name="Portal Messaging Org", slug="portal-messaging-org"
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Portal Messaging Clinic",
            timezone="America/New_York",
        )

        gender = self.facility.patient_genders.first()
        self.patient_a = Patient.objects.create(
            facility=self.facility,
            first_name="Alice",
            last_name="Anderson",
            date_of_birth=date(1980, 1, 1),
            gender=gender,
        )
        self.patient_b = Patient.objects.create(
            facility=self.facility,
            first_name="Bob",
            last_name="Brown",
            date_of_birth=date(1985, 2, 2),
            gender=gender,
        )

        self.portal_user_a = User.objects.create_user(
            username="portal_a", password="x", email="a@example.com"
        )
        PatientPortalAccount.objects.create(
            user=self.portal_user_a, patient=self.patient_a
        )
        self.portal_user_b = User.objects.create_user(
            username="portal_b", password="x", email="b@example.com"
        )
        PatientPortalAccount.objects.create(
            user=self.portal_user_b, patient=self.patient_b
        )

    def _make_clinician_user(self):
        user = User.objects.create_user(
            username="clinician_user", password="x", email="clin@example.com"
        )
        OrganizationMembership.objects.create(
            user=user,
            organization=self.organization,
            role=OrganizationMembership.ROLE_MEMBER,
            is_active=True,
        )
        Staff.objects.create(
            user=user,
            facility=self.facility,
            role=StaffRole.objects.get(facility=self.facility, code="staff"),
            is_active=True,
        )
        return user

    def _make_inactive_portal_user(self):
        user = User.objects.create_user(
            username="portal_inactive", password="x", email="inactive@example.com"
        )
        patient = Patient.objects.create(
            facility=self.facility,
            first_name="Inactive",
            last_name="Patient",
            date_of_birth=date(1970, 3, 3),
            gender=self.facility.patient_genders.first(),
        )
        PatientPortalAccount.objects.create(user=user, patient=patient, is_active=False)
        return user

    def _make_thread(
        self,
        patient,
        subject="Subject",
        status_value=MessageThread.STATUS_OPEN,
        unread_for_patient=False,
        unread_for_clinician=True,
    ):
        return MessageThread.objects.create(
            facility=patient.facility,
            patient=patient,
            subject=subject,
            status=status_value,
            unread_for_patient=unread_for_patient,
            unread_for_clinician=unread_for_clinician,
        )

    def _make_patient_message(self, thread, body="Hello", sender_user=None):
        return Message.objects.create(
            thread=thread,
            sender_kind=Message.SENDER_PATIENT,
            sender_user=sender_user,
            sender_display_name="Patient",
            body=body,
        )

    def _make_clinician_message(self, thread, body="Hi back", sender_user=None):
        return Message.objects.create(
            thread=thread,
            sender_kind=Message.SENDER_CLINICIAN,
            sender_user=sender_user,
            sender_display_name="Dr. Clinician",
            body=body,
        )


class PortalMessagingAuthTests(PortalMessagingBaseMixin, APITestCase):
    """Cross-cutting auth checks across all four endpoints."""

    def test_anonymous_returns_401_on_list(self):
        response = self.client.get(THREADS_URL)
        self.assertEqual(response.status_code, 401)

    def test_anonymous_returns_401_on_create(self):
        response = self.client.post(
            THREADS_URL,
            {"subject": "Hello", "body": "world"},
            format="json",
        )
        self.assertEqual(response.status_code, 401)

    def test_anonymous_returns_401_on_detail(self):
        thread = self._make_thread(self.patient_a)
        response = self.client.get(_thread_detail_url(thread.id))
        self.assertEqual(response.status_code, 401)

    def test_anonymous_returns_401_on_reply(self):
        thread = self._make_thread(self.patient_a)
        response = self.client.post(
            _thread_reply_url(thread.id),
            {"body": "ping"},
            format="json",
        )
        self.assertEqual(response.status_code, 401)

    def test_clinician_without_portal_account_returns_403(self):
        clinician = self._make_clinician_user()
        self.client.force_authenticate(clinician)
        for response in (
            self.client.get(THREADS_URL),
            self.client.post(
                THREADS_URL,
                {"subject": "x", "body": "y"},
                format="json",
            ),
        ):
            self.assertEqual(response.status_code, 403)

        thread = self._make_thread(self.patient_a)
        self.assertEqual(
            self.client.get(_thread_detail_url(thread.id)).status_code, 403
        )
        self.assertEqual(
            self.client.post(
                _thread_reply_url(thread.id), {"body": "x"}, format="json"
            ).status_code,
            403,
        )

    def test_inactive_portal_account_returns_403(self):
        self.client.force_authenticate(self._make_inactive_portal_user())
        thread = self._make_thread(self.patient_a)
        for response in (
            self.client.get(THREADS_URL),
            self.client.post(
                THREADS_URL,
                {"subject": "x", "body": "y"},
                format="json",
            ),
            self.client.get(_thread_detail_url(thread.id)),
            self.client.post(
                _thread_reply_url(thread.id), {"body": "x"}, format="json"
            ),
        ):
            self.assertEqual(response.status_code, 403)


class PortalMessagingCreateTests(PortalMessagingBaseMixin, APITestCase):
    def test_create_thread_with_valid_body(self):
        self.client.force_authenticate(self.portal_user_a)
        before = timezone.now()
        response = self.client.post(
            THREADS_URL,
            {"subject": "Refill question", "body": "Can I get more Lisinopril?"},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        body = response.json()
        self.assertEqual(body["subject"], "Refill question")
        self.assertEqual(body["status"], MessageThread.STATUS_OPEN)
        self.assertEqual(body["unread_for_patient"], False)
        # Clinician-side state must never reach the patient.
        self.assertNotIn("unread_for_clinician", body)

        # Messages array present, with the first patient message.
        self.assertIn("messages", body)
        self.assertEqual(len(body["messages"]), 1)
        msg = body["messages"][0]
        self.assertEqual(msg["sender_kind"], Message.SENDER_PATIENT)
        self.assertEqual(msg["sender_display_name"], "Alice Anderson")
        self.assertEqual(msg["body"], "Can I get more Lisinopril?")
        self.assertNotIn("sender_user", msg)

        # DB invariants.
        thread = MessageThread.objects.get(pk=body["id"])
        self.assertEqual(thread.patient, self.patient_a)
        self.assertEqual(thread.facility, self.patient_a.facility)
        self.assertTrue(thread.unread_for_clinician)
        self.assertFalse(thread.unread_for_patient)
        self.assertGreaterEqual(thread.last_message_at, before)
        self.assertEqual(thread.messages.count(), 1)

    def test_create_thread_with_empty_body_returns_400(self):
        self.client.force_authenticate(self.portal_user_a)
        response = self.client.post(
            THREADS_URL,
            {"subject": "Has subject", "body": "   "},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("body", response.json())
        self.assertFalse(MessageThread.objects.exists())

    def test_create_thread_with_empty_subject_returns_400(self):
        self.client.force_authenticate(self.portal_user_a)
        response = self.client.post(
            THREADS_URL,
            {"subject": "  ", "body": "Hello"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("subject", response.json())
        self.assertFalse(MessageThread.objects.exists())

    def test_create_thread_with_body_over_4000_chars_returns_400(self):
        self.client.force_authenticate(self.portal_user_a)
        response = self.client.post(
            THREADS_URL,
            {"subject": "Hello", "body": "x" * 4001},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("body", response.json())
        self.assertFalse(MessageThread.objects.exists())

    def test_create_thread_with_subject_over_150_chars_returns_400(self):
        self.client.force_authenticate(self.portal_user_a)
        response = self.client.post(
            THREADS_URL,
            {"subject": "x" * 151, "body": "Hello"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("subject", response.json())
        self.assertFalse(MessageThread.objects.exists())


class PortalMessagingListTests(PortalMessagingBaseMixin, APITestCase):
    def test_list_returns_only_own_threads_sorted_desc(self):
        now = timezone.now()

        # Patient B's thread — must not appear for patient A.
        thread_b = self._make_thread(self.patient_b, subject="B's thread")
        self._make_patient_message(thread_b)

        # Two threads for patient A — confirm ordering by -last_message_at.
        older = self._make_thread(self.patient_a, subject="Older")
        self._make_patient_message(older)
        MessageThread.objects.filter(pk=older.pk).update(
            last_message_at=now - timedelta(days=2)
        )

        newer = self._make_thread(self.patient_a, subject="Newer")
        self._make_patient_message(newer, body="Most recent body")
        MessageThread.objects.filter(pk=newer.pk).update(last_message_at=now)

        self.client.force_authenticate(self.portal_user_a)
        response = self.client.get(THREADS_URL)
        self.assertEqual(response.status_code, 200)
        rows = response.json()
        ids = [row["id"] for row in rows]
        self.assertEqual(ids, [newer.id, older.id])

    def test_list_payload_never_leaks_unread_for_clinician(self):
        thread = self._make_thread(
            self.patient_a, subject="Vis", unread_for_clinician=True
        )
        self._make_patient_message(thread, body="Snippet body")

        self.client.force_authenticate(self.portal_user_a)
        response = self.client.get(THREADS_URL)
        self.assertEqual(response.status_code, 200)
        rows = response.json()
        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertNotIn("unread_for_clinician", row)
        # Sanity: the patient-side fields that *should* be present.
        self.assertIn("unread_for_patient", row)
        self.assertIn("last_message_preview", row)
        self.assertEqual(row["last_message_preview"], "Snippet body")

    def test_list_preview_truncates_to_120_chars(self):
        thread = self._make_thread(self.patient_a, subject="Long")
        long_body = "y" * 200
        self._make_patient_message(thread, body=long_body)

        self.client.force_authenticate(self.portal_user_a)
        response = self.client.get(THREADS_URL)
        self.assertEqual(response.status_code, 200)
        row = response.json()[0]
        self.assertEqual(len(row["last_message_preview"]), 120)
        self.assertEqual(row["last_message_preview"], "y" * 120)


class PortalMessagingDetailTests(PortalMessagingBaseMixin, APITestCase):
    def test_detail_returns_thread_and_messages(self):
        thread = self._make_thread(self.patient_a, subject="Detail")
        m1 = self._make_patient_message(
            thread, body="Hi", sender_user=self.portal_user_a
        )
        m2 = self._make_clinician_message(
            thread,
            body="Hello back",
            sender_user=self._make_clinician_user(),
        )

        self.client.force_authenticate(self.portal_user_a)
        response = self.client.get(_thread_detail_url(thread.id))
        self.assertEqual(response.status_code, 200, response.data)
        body = response.json()
        self.assertEqual(body["id"], thread.id)
        self.assertEqual(body["subject"], "Detail")
        self.assertNotIn("unread_for_clinician", body)

        messages = body["messages"]
        self.assertEqual([m["id"] for m in messages], [m1.id, m2.id])
        # sender_user must never appear, even though one message has a
        # clinician sender_user populated in the DB.
        for msg in messages:
            self.assertNotIn("sender_user", msg)
            self.assertIn("sender_kind", msg)
            self.assertIn("sender_display_name", msg)
            self.assertIn("body", msg)
            self.assertIn("created_at", msg)

    def test_detail_other_patients_thread_returns_404(self):
        thread = self._make_thread(self.patient_b, subject="Bs thread")
        self.client.force_authenticate(self.portal_user_a)
        response = self.client.get(_thread_detail_url(thread.id))
        self.assertEqual(response.status_code, 404)

    def test_detail_flips_unread_for_patient_to_false(self):
        thread = self._make_thread(self.patient_a, unread_for_patient=True)
        self._make_clinician_message(thread, body="Reply from clinic")

        # Fixture set the flag; reset since the Message.save side effect
        # flips it back to True for clinician messages.
        thread.refresh_from_db()
        self.assertTrue(thread.unread_for_patient)

        self.client.force_authenticate(self.portal_user_a)
        response = self.client.get(_thread_detail_url(thread.id))
        self.assertEqual(response.status_code, 200)

        thread.refresh_from_db()
        self.assertFalse(thread.unread_for_patient)


class PortalMessagingReplyTests(PortalMessagingBaseMixin, APITestCase):
    def test_reply_on_own_open_thread_returns_201(self):
        thread = self._make_thread(self.patient_a)
        self._make_patient_message(thread, body="Initial")
        # Simulate clinician already read it: flip clinician flag to False.
        MessageThread.objects.filter(pk=thread.pk).update(unread_for_clinician=False)
        before = timezone.now()

        self.client.force_authenticate(self.portal_user_a)
        with CaptureQueriesContext(connection) as queries:
            response = self.client.post(
                _thread_reply_url(thread.id),
                {"body": "Follow-up question"},
                format="json",
            )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(
            any(
                '"messaging_messagethread"' in query["sql"]
                and "FOR UPDATE" in query["sql"].upper()
                for query in queries
            ),
            "Portal replies must lock the thread row before checking its state.",
        )
        body = response.json()
        self.assertEqual(body["sender_kind"], Message.SENDER_PATIENT)
        self.assertEqual(body["sender_display_name"], "Alice Anderson")
        self.assertEqual(body["body"], "Follow-up question")
        self.assertNotIn("sender_user", body)

        thread.refresh_from_db()
        self.assertTrue(thread.unread_for_clinician)
        self.assertGreaterEqual(thread.last_message_at, before)
        self.assertEqual(thread.messages.count(), 2)

    def test_reply_on_closed_thread_returns_400(self):
        thread = self._make_thread(
            self.patient_a, status_value=MessageThread.STATUS_CLOSED
        )
        self._make_patient_message(thread, body="Initial")

        self.client.force_authenticate(self.portal_user_a)
        response = self.client.post(
            _thread_reply_url(thread.id),
            {"body": "Trying to reopen"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("status", response.json())
        # No message was appended.
        self.assertEqual(thread.messages.count(), 1)

    def test_reply_on_other_patients_thread_returns_404(self):
        thread = self._make_thread(self.patient_b)
        self.client.force_authenticate(self.portal_user_a)
        response = self.client.post(
            _thread_reply_url(thread.id),
            {"body": "Nosy"},
            format="json",
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(thread.messages.count(), 0)

    def test_reply_with_empty_body_returns_400(self):
        thread = self._make_thread(self.patient_a)
        self._make_patient_message(thread, body="Initial")
        self.client.force_authenticate(self.portal_user_a)
        response = self.client.post(
            _thread_reply_url(thread.id),
            {"body": "   "},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("body", response.json())
        self.assertEqual(thread.messages.count(), 1)
