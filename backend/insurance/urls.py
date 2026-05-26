from rest_framework.routers import DefaultRouter

from .views import (
    FacilityInsuranceCarrierOverrideViewSet,
    InsuranceCarrierViewSet,
    OrganizationInsuranceCarrierPreferenceViewSet,
    PatientInsurancePolicyViewSet,
)

router = DefaultRouter()
router.register(r"carriers", InsuranceCarrierViewSet, basename="insurance-carrier")
router.register(
    r"organization-carriers",
    OrganizationInsuranceCarrierPreferenceViewSet,
    basename="organization-insurance-carrier",
)
router.register(
    r"facility-carrier-overrides",
    FacilityInsuranceCarrierOverrideViewSet,
    basename="facility-insurance-carrier-override",
)
router.register(
    r"policies", PatientInsurancePolicyViewSet, basename="patient-insurance-policy"
)

urlpatterns = router.urls
