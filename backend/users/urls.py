from django.urls import path

from .views import (
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    DemoLoginView,
    LogoutView,
    RegisterView,
    UserPreferenceView,
    UserProfileView,
    health_check,
)

urlpatterns = [
    path("token/", CookieTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", CookieTokenRefreshView.as_view(), name="token_refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("demo-login/", DemoLoginView.as_view(), name="demo_login"),
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", UserProfileView.as_view(), name="user_profile"),
    path("me/preferences/", UserPreferenceView.as_view(), name="user_preferences"),
    path("health/", health_check, name="health_check"),
]
