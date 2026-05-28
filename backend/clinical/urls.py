from rest_framework.routers import DefaultRouter

from .views import EncounterViewSet, ProgressNoteViewSet, VitalsViewSet
from .views_catalog import ICD10CatalogViewSet

router = DefaultRouter()
router.register(r"encounters", EncounterViewSet, basename="clinical-encounter")
router.register(r"progress-notes", ProgressNoteViewSet, basename="progress-note")
router.register(r"vitals", VitalsViewSet, basename="clinical-vitals")
router.register(r"icd10-catalog", ICD10CatalogViewSet, basename="icd10-catalog")

urlpatterns = router.urls
