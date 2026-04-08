from django.urls import path
from .views import (
    CurrentUserView,
    PhysicianListView,
    AppointmentStatusListView,
    AppointmentTypeListView,
)

urlpatterns = [
    # User and Staffing endpoints
    path("me/", CurrentUserView.as_view(), name="current-user"),
    path("physicians/", PhysicianListView.as_view(), name="physician-list"),
    
    # Configuration endpoints (Specific to the Facility)
    path("appointment-statuses/", AppointmentStatusListView.as_view(), name="appointment-status-list"),
    path("appointment-types/", AppointmentTypeListView.as_view(), name="appointment-type-list"),
    
    # Optional: If you want the frontend to see the list of roles/titles available
    # path("roles/", StaffRoleListView.as_view(), name="role-list"),
]