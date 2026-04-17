import os
from pathlib import Path

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

# --- ENV FLAGS ---
DEMO_MODE = os.environ.get("DEMO_MODE", "False") == "True"
DEBUG = os.environ.get("DEBUG", "True").lower() == "true"
IS_PRODUCTION = not DEBUG

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key")

# --- HOSTS ---
ALLOWED_HOSTS = [
    host for host in os.environ.get("ALLOWED_HOSTS", "").split(",") if host
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
    "corsheaders",
    "colorfield",
    "shared",
    "scheduler",
    "accounts",
    "facilities",
    "patients",
]

# --- MIDDLEWARE ---
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # MUST BE FIRST
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
        "DIRS": [],
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
    DATABASES = {"default": dj_database_url.parse(DATABASE_URL, conn_max_age=600)}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": "clinic_scheduler",
            "USER": "clinic_user",
            "PASSWORD": "password",
            "HOST": "localhost",
            "PORT": "5433",
        }
    }

# --- AUTH ---
AUTH_USER_MODEL = "accounts.User"

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
STATIC_URL = "static/"

if not DEBUG:
    STATIC_ROOT = BASE_DIR / "staticfiles"
    STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# --- DEFAULT PK ---
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- CORS (LOCAL + PROD) ---
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "https://careflow.xinyiklin.com",
]


CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "https://careflow.xinyiklin.com",
]

CORS_ALLOW_CREDENTIALS = True

# --- COOKIES ---
SESSION_COOKIE_SAMESITE = "None" if IS_PRODUCTION else "Lax"
SESSION_COOKIE_SECURE = IS_PRODUCTION

CSRF_COOKIE_SAMESITE = "None" if IS_PRODUCTION else "Lax"
CSRF_COOKIE_SECURE = IS_PRODUCTION

# --- DRF ---
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
}
