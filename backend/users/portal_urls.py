from django.urls import path

from allergies.portal_views import PortalAllergyListView
from appointments.portal_scheduling_views import (
    PortalSchedulingAppointmentTypesView,
    PortalSchedulingBookView,
    PortalSchedulingCancelView,
    PortalSchedulingProvidersView,
    PortalSchedulingSlotsView,
)
from appointments.portal_views import PortalAppointmentListView
from clinical.portal_views import PortalMedicalSummaryView
from medications.portal_views import (
    PortalMedicationListView,
    PortalPharmacyListView,
    RefillRequestCancelView,
    RefillRequestListCreateView,
)
from messaging.portal_views import (
    MessageThreadDetailView,
    MessageThreadListCreateView,
    MessageThreadReplyView,
)

from .portal_views import (
    PortalDemoLoginView,
    PortalMeView,
    PortalPreferredPharmacyView,
)

urlpatterns = [
    path("me/", PortalMeView.as_view(), name="portal_me"),
    path(
        "me/preferred-pharmacy/",
        PortalPreferredPharmacyView.as_view(),
        name="portal_me_preferred_pharmacy",
    ),
    path("demo-login/", PortalDemoLoginView.as_view(), name="portal_demo_login"),
    path(
        "appointments/",
        PortalAppointmentListView.as_view(),
        name="portal_appointments",
    ),
    path(
        "appointments/<int:pk>/cancel/",
        PortalSchedulingCancelView.as_view(),
        name="portal_appointment_cancel",
    ),
    path(
        "scheduling/providers/",
        PortalSchedulingProvidersView.as_view(),
        name="portal_scheduling_providers",
    ),
    path(
        "scheduling/appointment-types/",
        PortalSchedulingAppointmentTypesView.as_view(),
        name="portal_scheduling_types",
    ),
    path(
        "scheduling/slots/",
        PortalSchedulingSlotsView.as_view(),
        name="portal_scheduling_slots",
    ),
    path(
        "scheduling/book/",
        PortalSchedulingBookView.as_view(),
        name="portal_scheduling_book",
    ),
    path(
        "medications/",
        PortalMedicationListView.as_view(),
        name="portal_medications",
    ),
    path(
        "refill-requests/",
        RefillRequestListCreateView.as_view(),
        name="portal_refill_requests",
    ),
    path(
        "refill-requests/<int:pk>/cancel/",
        RefillRequestCancelView.as_view(),
        name="portal_refill_request_cancel",
    ),
    path(
        "pharmacies/",
        PortalPharmacyListView.as_view(),
        name="portal_pharmacies",
    ),
    path("allergies/", PortalAllergyListView.as_view(), name="portal_allergies"),
    path(
        "medical-summary/",
        PortalMedicalSummaryView.as_view(),
        name="portal_medical_summary",
    ),
    path(
        "messaging/threads/",
        MessageThreadListCreateView.as_view(),
        name="portal_messaging_threads",
    ),
    path(
        "messaging/threads/<int:pk>/",
        MessageThreadDetailView.as_view(),
        name="portal_messaging_thread_detail",
    ),
    path(
        "messaging/threads/<int:pk>/reply/",
        MessageThreadReplyView.as_view(),
        name="portal_messaging_thread_reply",
    ),
]
