from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    OrganizationPeopleViewSet,
    OrganizationPharmacyPreferenceViewSet,
    OrganizationViewSet,
)

router = DefaultRouter()
router.register(r"people", OrganizationPeopleViewSet, basename="organization-people")
router.register(
    r"pharmacies",
    OrganizationPharmacyPreferenceViewSet,
    basename="organization-pharmacies",
)

urlpatterns = [
    path(
        "",
        OrganizationViewSet.as_view(
            {
                "get": "list",
            }
        ),
    ),
    path(
        "<int:pk>/",
        OrganizationViewSet.as_view(
            {
                "get": "retrieve",
                "patch": "partial_update",
            }
        ),
    ),
    path("", include(router.urls)),
]
