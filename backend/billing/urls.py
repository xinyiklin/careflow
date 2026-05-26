from rest_framework.routers import DefaultRouter

from .views_billing import (
    EffectiveFeeScheduleItemViewSet,
    EncounterBillingRecordViewSet,
)
from .views_fee_schedule import (
    CPTCatalogViewSet,
    FacilityFeeScheduleItemViewSet,
    FacilityFeeScheduleOverrideViewSet,
    FacilityFeeScheduleViewSet,
    OrganizationFeeScheduleItemViewSet,
    OrganizationFeeScheduleViewSet,
)

router = DefaultRouter()
router.register(
    r"encounter-billing-records",
    EncounterBillingRecordViewSet,
    basename="encounter-billing-record",
)
router.register(
    r"fee-schedule-items",
    EffectiveFeeScheduleItemViewSet,
    basename="fee-schedule-item",
)
router.register(
    r"cpt-catalog",
    CPTCatalogViewSet,
    basename="cpt-catalog",
)
router.register(
    r"organization-fee-schedules",
    OrganizationFeeScheduleViewSet,
    basename="organization-fee-schedule",
)
router.register(
    r"organization-fee-schedule-items",
    OrganizationFeeScheduleItemViewSet,
    basename="organization-fee-schedule-item",
)
router.register(
    r"facility-fee-schedules",
    FacilityFeeScheduleViewSet,
    basename="facility-fee-schedule",
)
router.register(
    r"facility-fee-schedule-items",
    FacilityFeeScheduleItemViewSet,
    basename="facility-fee-schedule-item",
)
router.register(
    r"facility-fee-schedule-overrides",
    FacilityFeeScheduleOverrideViewSet,
    basename="facility-fee-schedule-override",
)

urlpatterns = router.urls
