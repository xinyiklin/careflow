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
from medications.portal_views import PortalMedicationListView

from .portal_views import PortalDemoLoginView, PortalMeView

urlpatterns = [
    path("me/", PortalMeView.as_view(), name="portal_me"),
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
    path("allergies/", PortalAllergyListView.as_view(), name="portal_allergies"),
    path(
        "medical-summary/",
        PortalMedicalSummaryView.as_view(),
        name="portal_medical_summary",
    ),
]
