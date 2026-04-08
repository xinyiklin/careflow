from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),

    # AUTH (JWT)
    path('api/accounts/token/', TokenObtainPairView.as_view()),
    path('api/accounts/token/refresh/', TokenRefreshView.as_view()),

    # APP ROUTES
    path('api/accounts/', include('accounts.urls')),
    path('api/facilities/', include('facilities.urls')),
    path('api/patients/', include('patients.urls')),
    path('api/scheduler/', include('scheduler.urls')),
]