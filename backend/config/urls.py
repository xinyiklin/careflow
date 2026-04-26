from django.contrib import admin
from django.urls import include, path

from config.views import api_home
from users.views import CookieTokenObtainPairView, CookieTokenRefreshView, health_check

urlpatterns = [
    path("", api_home),
    path("admin/", admin.site.urls),
    path("health/", health_check),
    path(
        "v1/users/token/", CookieTokenObtainPairView.as_view(), name="token_obtain_pair"
    ),
    path(
        "v1/users/token/refresh/",
        CookieTokenRefreshView.as_view(),
        name="token_refresh",
    ),
    path("v1/users/", include("users.urls")),
    path("v1/organizations/", include("organizations.urls")),
    path("v1/facilities/", include("facilities.urls")),
    path("v1/patients/", include("patients.urls")),
    path("v1/insurance/", include("insurance.urls")),
    path("v1/appointments/", include("appointments.urls")),
]
