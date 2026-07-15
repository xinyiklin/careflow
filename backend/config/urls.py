from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView

from config.views import api_home
from users.views import health_check

urlpatterns = [
    path("", api_home),
    path("admin/", admin.site.urls),
    path("health/", health_check),
    path("v1/users/", include("users.urls")),
    path("v1/portal/", include("users.portal_urls")),
    path("v1/organizations/", include("organizations.urls")),
    path("v1/facilities/", include("facilities.urls")),
    path("v1/patients/", include("patients.urls")),
    path("v1/insurance/", include("insurance.urls")),
    path("v1/appointments/", include("appointments.urls")),
    path("v1/clinical/", include("clinical.urls")),
    path("v1/allergies/", include("allergies.urls")),
    path("v1/medications/", include("medications.urls")),
    path("v1/messaging/", include("messaging.urls")),
    path("v1/billing/", include("billing.urls")),
    path("v1/audit/", include("audit.urls")),
    path("v1/schema/", SpectacularAPIView.as_view(), name="schema"),
]
