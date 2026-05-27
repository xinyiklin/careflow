from rest_framework.routers import DefaultRouter

from .views import PatientAllergyViewSet
from .views_catalog import AllergenCatalogViewSet, ReactionCatalogViewSet

router = DefaultRouter()
router.register(r"patient-allergies", PatientAllergyViewSet, basename="patient-allergy")
router.register(
    r"allergen-catalog", AllergenCatalogViewSet, basename="allergen-catalog"
)
router.register(
    r"reaction-catalog", ReactionCatalogViewSet, basename="reaction-catalog"
)

urlpatterns = router.urls
