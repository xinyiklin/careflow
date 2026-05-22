from rest_framework.routers import DefaultRouter

from .views import EncounterViewSet, ProgressNoteViewSet

router = DefaultRouter()
router.register(r"encounters", EncounterViewSet, basename="clinical-encounter")
router.register(r"progress-notes", ProgressNoteViewSet, basename="progress-note")

urlpatterns = router.urls
