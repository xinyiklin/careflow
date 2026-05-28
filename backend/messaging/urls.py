from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import MessageThreadViewSet

router = DefaultRouter()
router.register(r"threads", MessageThreadViewSet, basename="message-thread")

urlpatterns = [
    path("", include(router.urls)),
]
