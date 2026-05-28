from rest_framework.routers import DefaultRouter

from .views import AppointmentViewSet
from .views_bookable import BookableSlotViewSet

router = DefaultRouter()
router.register(r"bookable-slots", BookableSlotViewSet, basename="bookable-slot")
router.register(r"", AppointmentViewSet, basename="appointment")

urlpatterns = router.urls
