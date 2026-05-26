from rest_framework.routers import DefaultRouter

from .views import MedicationViewSet

router = DefaultRouter()
router.register(r"", MedicationViewSet, basename="medication")

urlpatterns = router.urls
