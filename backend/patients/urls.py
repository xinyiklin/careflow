from rest_framework.routers import DefaultRouter

from .views import (
    CareProviderViewSet,
    PatientDocumentCategoryViewSet,
    PatientDocumentViewSet,
    PatientViewSet,
    PharmacyViewSet,
)

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
