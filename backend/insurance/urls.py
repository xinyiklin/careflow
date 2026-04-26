from rest_framework.routers import DefaultRouter

from .views import InsuranceCarrierViewSet, PatientInsurancePolicyViewSet

router = DefaultRouter()
router.register(r"carriers", InsuranceCarrierViewSet, basename="insurance-carrier")
router.register(
    r"policies", PatientInsurancePolicyViewSet, basename="patient-insurance-policy"
)

urlpatterns = router.urls
