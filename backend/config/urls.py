from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # 1. AUTHENTICATION ENDPOINTS
    # This is the "Login" endpoint for your React frontend
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    # This is used to get a new access token when the old one expires
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # 2. APP ENDPOINTS
    path('api/accounts/', include('accounts.urls')),
    path('api/facilities/', include('facilities.urls')),
    path('api/patients/', include('patients.urls')),
]