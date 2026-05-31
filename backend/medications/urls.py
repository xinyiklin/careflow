from rest_framework.routers import DefaultRouter

from .views import (
    MedicationViewSet,
    PrescriberDelegationViewSet,
    RefillRequestViewSet,
)
from .views_catalog import (
    FrequencyCatalogViewSet,
    MedicationCatalogViewSet,
    RouteCatalogViewSet,
)

router = DefaultRouter()
# Catalogs and refill-requests are registered before the empty-prefix
# MedicationViewSet so the router matches /catalog/, /refill-requests/,
# etc. before falling through to the patient medication list.
router.register(r"catalog", MedicationCatalogViewSet, basename="medication-catalog")
router.register(
    r"route-catalog", RouteCatalogViewSet, basename="medication-route-catalog"
)
router.register(
    r"frequency-catalog",
    FrequencyCatalogViewSet,
    basename="medication-frequency-catalog",
)
router.register(
    r"refill-requests", RefillRequestViewSet, basename="medication-refill-request"
)
router.register(
    r"prescriber-delegations",
    PrescriberDelegationViewSet,
    basename="prescriber-delegation",
)
router.register(r"", MedicationViewSet, basename="medication")

urlpatterns = router.urls
