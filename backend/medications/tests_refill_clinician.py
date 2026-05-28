"""Integration tests for the clinician refill-request viewset.

Covers ``/v1/medications/refill-requests/`` (list + detail) and the
``approve`` / ``deny`` detail actions. All endpoints are gated by
``FacilityScopedViewSetMixin`` and the ``medications.view`` /
``medications.manage`` security permissions. Patient-initiated create
and cancel routes live on the portal viewset and are covered in
``tests_refill_portal.py``.
"""

from datetime import date

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from audit.models import AuditEvent
from facilities.models import Facility, Staff, StaffRole
from organizations.models import Organization, OrganizationMembership
from patients.models import Patient

from .models import Medication, RefillRequest

User = get_user_model()


class ClinicianRefillBaseMixin:
    """Two facilities, a clinician with manage perms in facility A, a
    second clinician in facility B, plus two patients (one per facility)
    with one active medication each."""

    def setUp(self):
        super().setUp()
        self.organization = Organization.objects.create(
            name="Refill Clinician Org", slug="refill-clinician-org"
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Refill Clinician Clinic",
            timezone="America/New_York",
        )
        self.other_facility = Facility.objects.create(
            organization=self.organization,
            name="Other Refill Clinic",
            timezone="America/New_York",
        )

        # Clinician at facility A — defaults to physician (medications.manage).
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

        # Patients (one per facility).
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

        self.medication = Medication.objects.create(
            patient=self.patient,
            facility=self.facility,
            status=Medication.STATUS_ACTIVE,
            medication_name="Lisinopril",
            dose="10 mg",
            route="PO",
            frequency="Daily",
        )
        self.medication_other = Medication.objects.create(
            patient=self.patient_other,
            facility=self.other_facility,
            status=Medication.STATUS_ACTIVE,
            medication_name="Metformin",
            dose="500 mg",
            route="PO",
            frequency="BID",
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


class ClinicianRefillListTests(ClinicianRefillBaseMixin, APITestCase):
    URL = "/v1/medications/refill-requests/"

    def test_anonymous_returns_401(self):
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 401)

    def test_cross_facility_request_is_hidden(self):
        # Facility A's refill — visible.
        own = RefillRequest.objects.create(
            medication=self.medication,
            patient=self.patient,
            facility=self.facility,
            status=RefillRequest.STATUS_PENDING,
        )
        # Facility B's refill — must NOT appear in facility A's list.
        RefillRequest.objects.create(
            medication=self.medication_other,
            patient=self.patient_other,
            facility=self.other_facility,
            status=RefillRequest.STATUS_PENDING,
        )

        self.client.force_authenticate(self.clinician)
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 200, response.data)
        ids = [row["id"] for row in response.json()]
        self.assertEqual(ids, [own.id])

    def test_list_filter_by_status(self):
        pending = RefillRequest.objects.create(
            medication=self.medication,
            patient=self.patient,
            facility=self.facility,
            status=RefillRequest.STATUS_PENDING,
        )
        # A denied refill on a *separate* medication so the unique
        # pending-per-medication constraint isn't violated.
        med2 = Medication.objects.create(
            patient=self.patient,
            facility=self.facility,
            status=Medication.STATUS_ACTIVE,
            medication_name="Atorvastatin",
            dose="20 mg",
            route="PO",
            frequency="QHS",
        )
        RefillRequest.objects.create(
            medication=med2,
            patient=self.patient,
            facility=self.facility,
            status=RefillRequest.STATUS_DENIED,
            resolved_at=timezone.now(),
            resolved_by=self.clinician,
        )

        self.client.force_authenticate(self.clinician)
        response = self.client.get(self.URL, {"status": "pending"})
        self.assertEqual(response.status_code, 200)
        ids = [row["id"] for row in response.json()]
        self.assertEqual(ids, [pending.id])

    def test_list_filter_by_patient_id(self):
        # Build a second patient at facility A so we have something to
        # filter against.
        sibling = Patient.objects.create(
            facility=self.facility,
            first_name="Carol",
            last_name="Cooper",
            date_of_birth=date(1975, 5, 5),
            gender=self.facility.patient_genders.first(),
        )
        sibling_med = Medication.objects.create(
            patient=sibling,
            facility=self.facility,
            status=Medication.STATUS_ACTIVE,
            medication_name="Amlodipine",
            dose="5 mg",
            route="PO",
            frequency="Daily",
        )
        own = RefillRequest.objects.create(
            medication=self.medication,
            patient=self.patient,
            facility=self.facility,
            status=RefillRequest.STATUS_PENDING,
        )
        RefillRequest.objects.create(
            medication=sibling_med,
            patient=sibling,
            facility=self.facility,
            status=RefillRequest.STATUS_PENDING,
        )

        self.client.force_authenticate(self.clinician)
        response = self.client.get(self.URL, {"patient_id": self.patient.id})
        self.assertEqual(response.status_code, 200)
        ids = [row["id"] for row in response.json()]
        self.assertEqual(ids, [own.id])

    def test_detail_returns_clinician_note_and_resolved_by_name(self):
        refill = RefillRequest.objects.create(
            medication=self.medication,
            patient=self.patient,
            facility=self.facility,
            status=RefillRequest.STATUS_APPROVED,
            clinician_note="Approved per protocol.",
            resolved_at=timezone.now(),
            resolved_by=self.clinician,
        )

        self.client.force_authenticate(self.clinician)
        response = self.client.get(f"{self.URL}{refill.id}/")
        self.assertEqual(response.status_code, 200, response.data)
        body = response.json()
        self.assertEqual(body["id"], refill.id)
        self.assertEqual(body["clinician_note"], "Approved per protocol.")
        self.assertTrue(body["resolved_by_name"])
        # Patient display + medication snapshot also surface.
        self.assertEqual(body["patient_id"], self.patient.id)
        self.assertEqual(body["patient_display_name"], "Anderson, Alice")
        self.assertEqual(body["medication_name"], "Lisinopril")
        self.assertEqual(body["dose"], "10 mg")
        self.assertEqual(body["frequency"], "Daily")
        self.assertEqual(body["status"], "approved")
        self.assertEqual(body["status_label"], "Approved")

    def test_no_create_route(self):
        """The clinician viewset only exposes list / detail / approve /
        deny. Posting to the collection URL must return 405 (or 403/404
        if the router silently maps it elsewhere)."""
        self.client.force_authenticate(self.clinician)
        response = self.client.post(self.URL, {}, format="json")
        self.assertEqual(response.status_code, 405)


class ClinicianRefillApproveTests(ClinicianRefillBaseMixin, APITestCase):
    def _url(self, pk):
        return f"/v1/medications/refill-requests/{pk}/approve/"

    def _make_pending_refill(self):
        return RefillRequest.objects.create(
            medication=self.medication,
            patient=self.patient,
            facility=self.facility,
            status=RefillRequest.STATUS_PENDING,
        )

    def test_approve_without_manage_permission_returns_403(self):
        refill = self._make_pending_refill()
        # Build a view-only user (staff role has medications.view but
        # NOT medications.manage).
        view_only = self._make_clinician(
            "view_only", self.facility, role_code="staff", is_default=True
        )
        self.client.force_authenticate(view_only)
        response = self.client.post(self._url(refill.id), {}, format="json")
        self.assertEqual(response.status_code, 403)
        refill.refresh_from_db()
        self.assertEqual(refill.status, RefillRequest.STATUS_PENDING)

    def test_approve_with_manage_permission_returns_200(self):
        refill = self._make_pending_refill()
        self.client.force_authenticate(self.clinician)
        response = self.client.post(
            self._url(refill.id),
            {"clinician_note": "Cleared for 30-day refill."},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        body = response.json()
        self.assertEqual(body["status"], "approved")
        self.assertIsNotNone(body["resolved_at"])
        self.assertTrue(body["resolved_by_name"])
        self.assertEqual(body["clinician_note"], "Cleared for 30-day refill.")

        refill.refresh_from_db()
        self.assertEqual(refill.status, RefillRequest.STATUS_APPROVED)
        self.assertIsNotNone(refill.resolved_at)
        self.assertEqual(refill.resolved_by_id, self.clinician.id)
        self.assertTrue(refill.resolved_by_name)

        audit_event = AuditEvent.objects.filter(
            actor=self.clinician,
            action="update",
            app_label="medications",
            model_name="refillrequest",
            object_pk=str(refill.pk),
        ).first()
        self.assertIsNotNone(audit_event)
        self.assertIn("Approved refill request for", audit_event.summary)
        self.assertIn("Lisinopril", audit_event.summary)
        # Audit row carries facility + patient context.
        self.assertEqual(audit_event.facility_id, self.facility.id)
        self.assertEqual(audit_event.patient_id, self.patient.id)
        self.assertEqual(audit_event.metadata.get("status"), "approved")

    def test_approve_non_pending_returns_400(self):
        refill = RefillRequest.objects.create(
            medication=self.medication,
            patient=self.patient,
            facility=self.facility,
            status=RefillRequest.STATUS_DENIED,
            resolved_at=timezone.now(),
            resolved_by=self.clinician,
        )
        self.client.force_authenticate(self.clinician)
        response = self.client.post(self._url(refill.id), {}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_cross_facility_approve_returns_404(self):
        # Refill belongs to facility B; clinician scoped to facility A
        # via their default staff profile.
        refill = RefillRequest.objects.create(
            medication=self.medication_other,
            patient=self.patient_other,
            facility=self.other_facility,
            status=RefillRequest.STATUS_PENDING,
        )
        self.client.force_authenticate(self.clinician)
        response = self.client.post(self._url(refill.id), {}, format="json")
        # Not visible in the facility-scoped queryset → 404 via
        # ``get_object``'s NotFound path (FacilityScopedViewSetMixin
        # does not raise PermissionDenied for missing facility rows).
        self.assertEqual(response.status_code, 404)
        refill.refresh_from_db()
        self.assertEqual(refill.status, RefillRequest.STATUS_PENDING)


class ClinicianRefillDenyTests(ClinicianRefillBaseMixin, APITestCase):
    def _url(self, pk):
        return f"/v1/medications/refill-requests/{pk}/deny/"

    def _make_pending_refill(self):
        return RefillRequest.objects.create(
            medication=self.medication,
            patient=self.patient,
            facility=self.facility,
            status=RefillRequest.STATUS_PENDING,
        )

    def test_deny_with_manage_permission_returns_200(self):
        refill = self._make_pending_refill()
        self.client.force_authenticate(self.clinician)
        response = self.client.post(
            self._url(refill.id),
            {"clinician_note": "Requires follow-up appointment."},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        body = response.json()
        self.assertEqual(body["status"], "denied")
        self.assertIsNotNone(body["resolved_at"])
        self.assertTrue(body["resolved_by_name"])

        refill.refresh_from_db()
        self.assertEqual(refill.status, RefillRequest.STATUS_DENIED)
        self.assertEqual(refill.clinician_note, "Requires follow-up appointment.")

        audit_event = AuditEvent.objects.filter(
            actor=self.clinician,
            action="update",
            app_label="medications",
            model_name="refillrequest",
            object_pk=str(refill.pk),
        ).first()
        self.assertIsNotNone(audit_event)
        self.assertIn("Denied refill request for", audit_event.summary)
        self.assertEqual(audit_event.facility_id, self.facility.id)
        self.assertEqual(audit_event.patient_id, self.patient.id)
        self.assertEqual(audit_event.metadata.get("status"), "denied")

    def test_deny_non_pending_returns_400(self):
        refill = RefillRequest.objects.create(
            medication=self.medication,
            patient=self.patient,
            facility=self.facility,
            status=RefillRequest.STATUS_APPROVED,
            resolved_at=timezone.now(),
            resolved_by=self.clinician,
        )
        self.client.force_authenticate(self.clinician)
        response = self.client.post(self._url(refill.id), {}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_cross_facility_deny_returns_404(self):
        refill = RefillRequest.objects.create(
            medication=self.medication_other,
            patient=self.patient_other,
            facility=self.other_facility,
            status=RefillRequest.STATUS_PENDING,
        )
        self.client.force_authenticate(self.clinician)
        response = self.client.post(self._url(refill.id), {}, format="json")
        self.assertEqual(response.status_code, 404)
        refill.refresh_from_db()
        self.assertEqual(refill.status, RefillRequest.STATUS_PENDING)
