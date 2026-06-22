import os
import sys
from datetime import timedelta
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def get_csv_setting(name, default):
    value = os.environ.get(name)
    source = value if value is not None else default
    return [item.strip() for item in source.split(",") if item.strip()]


# --- ENV FLAGS ---
DEMO_MODE = os.environ.get("DEMO_MODE", "False").lower() == "true"
# True while running the test suite. Used to disable request throttling so the
# per-process throttle cache doesn't bleed counters across test cases.
TESTING = "test" in sys.argv
DEMO_USERNAME = os.environ.get("DEMO_USERNAME", "demo")
PORTAL_DEMO_USERNAME = os.environ.get("PORTAL_DEMO_USERNAME", "patient_demo")
ALLOW_PUBLIC_REGISTRATION = (
    os.environ.get("ALLOW_PUBLIC_REGISTRATION", "False").lower() == "true"
)

DEBUG_VALUE = os.environ.get("DEBUG")
if DEBUG_VALUE is None:
    DEBUG = not (os.environ.get("DATABASE_URL") or os.environ.get("RENDER"))
else:
    DEBUG = DEBUG_VALUE.lower() == "true"

SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured("SECRET_KEY must be set when DEBUG is false.")
    SECRET_KEY = "careflow-dev-secret-key-change-me-before-production-2026"
elif not DEBUG and len(SECRET_KEY.encode("utf-8")) < 32:
    raise ImproperlyConfigured(
        "SECRET_KEY must be at least 32 bytes when DEBUG is false."
    )

FIELD_ENCRYPTION_KEY = os.environ.get("FIELD_ENCRYPTION_KEY")
if not FIELD_ENCRYPTION_KEY:
    if not DEBUG:
        raise ImproperlyConfigured(
            "FIELD_ENCRYPTION_KEY must be set when DEBUG is false."
        )
    FIELD_ENCRYPTION_KEY = "fhzlERUrPwNfBd1v_pBp1wVt7ISIyP1g0nVQgyUG4Kc="

# --- HOSTS ---
ALLOWED_HOSTS = [
    host
    for host in get_csv_setting(
        "ALLOWED_HOSTS",
        "localhost,127.0.0.1,careflow.xinyiklin.com,api.careflow.xinyiklin.com,.onrender.com",
    )
    if host
]

# --- APPS ---
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "colorfield",
    "drf_spectacular",
    "shared",
    "appointments",
    "clinical",
    "allergies",
    "medications",
    "messaging",
    "billing",
    "users",
    "organizations",
    "facilities",
    "patients",
    "insurance",
    "audit",
]

# --- MIDDLEWARE ---
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

# --- TEMPLATES ---
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# --- DATABASE ---
DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    # Force TLS for the managed database in production; dj_database_url only
    # enables it from the URL's sslmode otherwise. Gate behind DB_SSL_REQUIRE
    # (default True when DEBUG is False) for non-TLS local DATABASE_URL setups.
    DB_SSL_REQUIRE = os.environ.get("DB_SSL_REQUIRE", str(not DEBUG)).lower() == "true"
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL, conn_max_age=600, ssl_require=DB_SSL_REQUIRE
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("DB_NAME", "careflow"),
            "USER": os.environ.get("DB_USER", "careflow_user"),
            "PASSWORD": os.environ.get("DB_PASSWORD", "password"),
            "HOST": os.environ.get("DB_HOST", "localhost"),
            "PORT": os.environ.get("DB_PORT", "5433"),
        }
    }

# --- AUTH ---
AUTH_USER_MODEL = "users.User"

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "UserAttributeSimilarityValidator"
        )
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- I18N ---
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# --- STATIC FILES ---
STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
MEDIA_URL = "/media/"

# Document storage. Local development stores files on disk; production can use
# Cloudflare R2 through its S3-compatible API.
PATIENT_DOCUMENT_STORAGE_BACKEND = os.environ.get(
    "PATIENT_DOCUMENT_STORAGE_BACKEND",
    "local",
)
PATIENT_DOCUMENT_LOCAL_ROOT = os.environ.get(
    "PATIENT_DOCUMENT_LOCAL_ROOT",
    str(BASE_DIR / "local_documents"),
)
PATIENT_DOCUMENT_R2_ACCOUNT_ID = os.environ.get("CLOUDFLARE_R2_ACCOUNT_ID", "")
PATIENT_DOCUMENT_R2_ACCESS_KEY_ID = os.environ.get(
    "CLOUDFLARE_R2_ACCESS_KEY_ID",
    "",
)
PATIENT_DOCUMENT_R2_SECRET_ACCESS_KEY = os.environ.get(
    "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
    "",
)
PATIENT_DOCUMENT_R2_BUCKET = os.environ.get("CLOUDFLARE_R2_BUCKET", "")
PATIENT_DOCUMENT_R2_ENDPOINT_URL = os.environ.get(
    "CLOUDFLARE_R2_ENDPOINT_URL",
    "",
)
PATIENT_DOCUMENT_R2_REGION = os.environ.get("CLOUDFLARE_R2_REGION", "auto")
PATIENT_DOCUMENT_MAX_UPLOAD_BYTES = int(
    os.environ.get("PATIENT_DOCUMENT_MAX_UPLOAD_BYTES", 10 * 1024 * 1024)
)
PATIENT_DOCUMENT_MAX_BUNDLE_BYTES = int(
    os.environ.get("PATIENT_DOCUMENT_MAX_BUNDLE_BYTES", 25 * 1024 * 1024)
)
PATIENT_DOCUMENT_MAX_BUNDLE_PAGES = int(
    os.environ.get("PATIENT_DOCUMENT_MAX_BUNDLE_PAGES", 100)
)

if not DEBUG:
    STATIC_ROOT = BASE_DIR / "staticfiles"
    STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# --- DEFAULT PK ---
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- CORS / CSRF ---
# Local dev origins: 5173 = clinician app, 5174 = patient portal app.
CORS_ALLOWED_ORIGINS = get_csv_setting(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:5174,https://careflow.xinyiklin.com,https://portal.careflow.xinyiklin.com",
)

CSRF_TRUSTED_ORIGINS = get_csv_setting(
    "CSRF_TRUSTED_ORIGINS",
    "http://localhost:5173,http://localhost:5174,https://careflow.xinyiklin.com,https://portal.careflow.xinyiklin.com,https://api.careflow.xinyiklin.com",
)

CORS_ALLOW_CREDENTIALS = True

# --- COOKIES ---
SESSION_COOKIE_SAMESITE = "None" if not DEBUG else "Lax"
SESSION_COOKIE_SECURE = not DEBUG

CSRF_COOKIE_SAMESITE = "None" if not DEBUG else "Lax"
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_DOMAIN = os.environ.get(
    "CSRF_COOKIE_DOMAIN",
    None if DEBUG else ".careflow.xinyiklin.com",
)

# --- SECURITY HEADERS ---
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = (
    os.environ.get("SECURE_SSL_REDIRECT", str(not DEBUG)).lower() == "true"
)
SECURE_HSTS_SECONDS = int(
    os.environ.get("SECURE_HSTS_SECONDS", 31536000 if not DEBUG else 0)
)
SECURE_HSTS_INCLUDE_SUBDOMAINS = (
    os.environ.get("SECURE_HSTS_INCLUDE_SUBDOMAINS", str(not DEBUG)).lower() == "true"
)
SECURE_HSTS_PRELOAD = (
    os.environ.get("SECURE_HSTS_PRELOAD", str(not DEBUG)).lower() == "true"
)
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# --- DRF ---
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    # Fail closed: a view that forgets to declare permission_classes requires
    # authentication rather than defaulting to AllowAny. Public endpoints
    # (login, refresh, logout, register, demo-login) set AllowAny explicitly.
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    # DRF reads the client IP as the Nth-from-last X-Forwarded-For entry, where
    # N = trusted proxy hops in front of the app (a single Render router = 1).
    # This MUST match production's real hop count: too low keys every client on
    # one shared proxy IP (mass 429s — loud, but breaks logins), too high trusts
    # a client-spoofable entry (silent throttle bypass). Tune per deployment via
    # the NUM_PROXIES env var (e.g. 2 if a CDN like Cloudflare fronts Render);
    # verify against a real production request before relying on per-client limits.
    "NUM_PROXIES": int(os.environ.get("NUM_PROXIES", "1")),
    # ScopedRateThrottle is a no-op on views without a `throttle_scope`, so this
    # only throttles the sensitive auth endpoints that opt in. Rates are None
    # under tests to keep the per-process throttle cache from bleeding counters
    # across cases. NOTE: counters live in the default LocMemCache, so limits
    # are enforced per worker — a shared cache (e.g. Redis) is required for hard
    # limits across multiple Render workers.
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "login": None if TESTING else "10/min",
        "refresh": None if TESTING else "60/min",
        "demo": None if TESTING else "10/min",
    },
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SIMPLE_JWT = {
    # Rotate on every refresh and blacklist the consumed token so a captured
    # refresh token can't be replayed, and logout can revoke a live session.
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    # Match the refresh cookie's 14-day max_age (see users.views.set_refresh_cookie).
    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "CareFlow API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}
