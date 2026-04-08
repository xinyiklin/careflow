from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    # Endpoint for logging in and getting the JWT token
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    
    # Endpoint for refreshing the access token using the refresh token
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]