from django.urls import path

from allergies.portal_views import PortalAllergyListView
from appointments.portal_views import PortalAppointmentListView
from medications.portal_views import PortalMedicationListView

from .portal_views import PortalMeView

urlpatterns = [
    path("me/", PortalMeView.as_view(), name="portal_me"),
    path(
        "appointments/",
        PortalAppointmentListView.as_view(),
        name="portal_appointments",
    ),
    path(
        "medications/",
        PortalMedicationListView.as_view(),
        name="portal_medications",
    ),
    path("allergies/", PortalAllergyListView.as_view(), name="portal_allergies"),
]
