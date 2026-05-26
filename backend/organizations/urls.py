from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    FacilityPharmacyPreferenceOverrideViewSet,
    OrganizationPeopleViewSet,
    OrganizationPharmacyPreferenceViewSet,
    OrganizationRoleViewSet,
    OrganizationSecurityViewSet,
    OrganizationViewSet,
)

router = DefaultRouter()
router.register(r"people", OrganizationPeopleViewSet, basename="organization-people")
router.register(
    r"pharmacies",
    OrganizationPharmacyPreferenceViewSet,
    basename="organization-pharmacies",
)
router.register(
    r"facility-pharmacy-overrides",
    FacilityPharmacyPreferenceOverrideViewSet,
    basename="facility-pharmacy-overrides",
)
router.register(r"roles", OrganizationRoleViewSet, basename="organization-roles")
router.register(
    r"security", OrganizationSecurityViewSet, basename="organization-security"
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
