from rest_framework.routers import DefaultRouter

from .views import PatientAllergyViewSet

router = DefaultRouter()
router.register(r"patient-allergies", PatientAllergyViewSet, basename="patient-allergy")

urlpatterns = router.urls
