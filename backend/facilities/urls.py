from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AppointmentStatusViewSet,
    AppointmentTypeViewSet,
    FacilityResourceViewSet,
    FacilityViewSet,
    PatientGenderViewSet,
    StaffRoleViewSet,
    StaffTitleViewSet,
    StaffViewSet,
)

router = DefaultRouter()
router.register(r"staff", StaffViewSet, basename="staff")
router.register(
    r"appointment-statuses", AppointmentStatusViewSet, basename="appointment-status"
)
router.register(
    r"appointment-types", AppointmentTypeViewSet, basename="appointment-type"
)
router.register(r"resources", FacilityResourceViewSet, basename="facility-resource")
router.register(r"staff-roles", StaffRoleViewSet, basename="staff-role")
router.register(r"staff-titles", StaffTitleViewSet, basename="staff-title")
router.register(r"patient-genders", PatientGenderViewSet, basename="patient-gender")

urlpatterns = [
    path(
        "",
        FacilityViewSet.as_view(
            {
                "get": "list",
                "post": "create",
            }
        ),
        name="facility-list",
    ),
    path(
        "<int:pk>/",
        FacilityViewSet.as_view(
            {
                "get": "retrieve",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="facility-detail",
    ),
    path("", include(router.urls)),
]
