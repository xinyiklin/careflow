from rest_framework.routers import DefaultRouter

from .views import MedicationViewSet
from .views_catalog import (
    FrequencyCatalogViewSet,
    MedicationCatalogViewSet,
    RouteCatalogViewSet,
)

router = DefaultRouter()
# Catalogs registered before the empty-prefix MedicationViewSet so the
# router matches /catalog/ etc. before falling through to the patient
# medication list.
router.register(r"catalog", MedicationCatalogViewSet, basename="medication-catalog")
router.register(
    r"route-catalog", RouteCatalogViewSet, basename="medication-route-catalog"
)
router.register(
    r"frequency-catalog",
    FrequencyCatalogViewSet,
    basename="medication-frequency-catalog",
)
router.register(r"", MedicationViewSet, basename="medication")

urlpatterns = router.urls
