from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from audit.models import AuditEvent
from facilities.models import Facility, Staff, StaffRole
from organizations.models import Organization, OrganizationMembership

User = get_user_model()


class AuditEventScopeTests(TestCase):
    def setUp(self):
        self.organization = Organization.objects.create(
            name="CareFlow Health",
            slug="careflow-health",
        )
        self.other_organization = Organization.objects.create(
            name="Other Health",
            slug="other-health",
        )
        self.facility = Facility.objects.create(
            organization=self.organization,
            name="Main Clinic",
            timezone="America/New_York",
        )
        self.other_facility = Facility.objects.create(
            organization=self.other_organization,
            name="Other Clinic",
            timezone="America/New_York",
        )
        self.org_admin = User.objects.create_user(
            username="org_admin",
            password="testpass123",
            email="org-admin@example.com",
        )
        OrganizationMembership.objects.create(
            user=self.org_admin,
            organization=self.organization,
            role=OrganizationMembership.ROLE_ADMIN,
            is_active=True,
        )
        self.facility_admin = User.objects.create_user(
            username="facility_admin",
            password="testpass123",
            email="facility-admin@example.com",
        )
        OrganizationMembership.objects.create(
            user=self.facility_admin,
            organization=self.organization,
            role=OrganizationMembership.ROLE_MEMBER,
            is_active=True,
        )
        Staff.objects.create(
            user=self.facility_admin,
            facility=self.facility,
            role=StaffRole.objects.get(facility=self.facility, code="admin"),
            is_active=True,
            is_default=True,
        )
        self.staff_user = User.objects.create_user(
            username="front_desk",
            password="testpass123",
            email="front-desk@example.com",
        )
        OrganizationMembership.objects.create(
            user=self.staff_user,
            organization=self.organization,
            role=OrganizationMembership.ROLE_MEMBER,
            is_active=True,
        )
        Staff.objects.create(
            user=self.staff_user,
            facility=self.facility,
            role=StaffRole.objects.get(facility=self.facility, code="staff"),
            is_active=True,
            is_default=True,
        )
        AuditEvent.objects.create(
            actor=self.facility_admin,
            facility=self.facility,
            action="update",
            app_label="patients",
            model_name="Patient",
            object_pk="1",
            summary="Main clinic event",
        )
        AuditEvent.objects.create(
            actor=self.org_admin,
            facility=None,
            action="update",
            app_label="organizations",
            model_name="organizationmembership",
            object_pk="3",
            summary="Organization user event",
            metadata={"organization_id": self.organization.id},
        )
        AuditEvent.objects.create(
            actor=None,
            facility=self.other_facility,
            action="update",
            app_label="patients",
            model_name="Patient",
            object_pk="2",
            summary="Other clinic event",
        )

    def test_org_admin_sees_only_organization_events(self):
        client = APIClient()
        client.force_authenticate(self.org_admin)

        response = client.get(
            "/v1/audit/events/",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        summaries = [event["summary"] for event in response.json()]
        self.assertEqual(summaries, ["Organization user event", "Main clinic event"])

    def test_org_admin_can_filter_to_organization_scope(self):
        client = APIClient()
        client.force_authenticate(self.org_admin)

        response = client.get(
            "/v1/audit/events/",
            {"scope": "organization"},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        summaries = [event["summary"] for event in response.json()]
        self.assertEqual(summaries, ["Organization user event"])

    def test_facility_admin_sees_selected_facility_events(self):
        client = APIClient()
        client.force_authenticate(self.facility_admin)

        response = client.get(
            "/v1/audit/events/",
            {"facility": self.facility.pk},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 200)
        summaries = [event["summary"] for event in response.json()]
        self.assertEqual(summaries, ["Main clinic event"])

    def test_facility_admin_must_request_a_facility_scope(self):
        client = APIClient()
        client.force_authenticate(self.facility_admin)

        response = client.get(
            "/v1/audit/events/",
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 403)

    def test_non_admin_staff_cannot_view_facility_activity_log(self):
        client = APIClient()
        client.force_authenticate(self.staff_user)

        response = client.get(
            "/v1/audit/events/",
            {"facility": self.facility.pk},
            HTTP_HOST="localhost:8000",
        )

        self.assertEqual(response.status_code, 403)
