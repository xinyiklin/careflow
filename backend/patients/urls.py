from rest_framework.routers import DefaultRouter

from .views import PatientViewSet
from .views_documents import PatientDocumentCategoryViewSet, PatientDocumentViewSet
from .views_supporting import CareProviderViewSet, PharmacyViewSet

router = DefaultRouter()
router.register(
    r"document-categories",
    PatientDocumentCategoryViewSet,
    basename="patient-document-category",
)
router.register(r"documents", PatientDocumentViewSet, basename="patient-document")
router.register(r"pharmacies", PharmacyViewSet, basename="pharmacy")
router.register(r"providers", CareProviderViewSet, basename="care-provider")
router.register(r"", PatientViewSet, basename="patient")

urlpatterns = router.urls
