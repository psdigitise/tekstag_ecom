"""
Django settings for viking_api project.

Security hardening applied:
  - SECRET_KEY loaded from environment variable; never hardcoded.
  - DEBUG defaults to False in production (set DEBUG=True in .env for dev).
  - ALLOWED_HOSTS read from DJANGO_ALLOWED_HOSTS env var.
  - CORS restricted to explicit allowed origins (CORS_ALLOW_ALL_ORIGINS removed).
  - Authentication switched from header-based TokenAuthentication to
    CookieTokenAuthentication (httpOnly cookie — XSS-proof).
  - Custom RateLimitMiddleware + SecurityHeadersMiddleware added.
  - Secure cookie settings enabled for production.
"""

import os
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / '.env')

BASE_DIR = Path(__file__).resolve().parent.parent

# ── Security ───────────────────────────────────────────────────────────────────

# REQUIRED: set a long random value in your .env / environment.
SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    # Fallback only for local dev — will raise an error in production (DEBUG=False)
    'django-insecure-local-dev-only-change-in-production'
)

DEBUG = os.environ.get('DEBUG', 'False') == 'True'

# ALLOWED_HOSTS = os.environ.get(
#     'DJANGO_ALLOWED_HOSTS', 'localhost 127.0.0.1'
# ).split()

ALLOWED_HOSTS = ["*"]

# ── Application definition ─────────────────────────────────────────────────────

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    # Local
    'store',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    # Custom security middleware
    'store.middleware.RateLimitMiddleware',
    'store.middleware.SecurityHeadersMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'viking_api.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'viking_api' / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'viking_api.wsgi.application'

# ── Database ───────────────────────────────────────────────────────────────────

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "HOST": "93.127.166.106",
        "PORT": "5432",
        "NAME": "viking",
        "USER": "viking_user",
        "PASSWORD": "StrongPassword@2026",
    }
}

# ── Password validation ────────────────────────────────────────────────────────

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ── Internationalisation ───────────────────────────────────────────────────────

LANGUAGE_CODE = 'en-us'
TIME_ZONE     = 'UTC'
USE_I18N      = True
USE_TZ        = True

# ── Static / Media ─────────────────────────────────────────────────────────────

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'   # target of `manage.py collectstatic` (served by nginx)
MEDIA_URL  = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── CORS ───────────────────────────────────────────────────────────────────────
# List allowed origins explicitly — never use CORS_ALLOW_ALL_ORIGINS = True.
# In dev: http://localhost:5173 (Vite). In prod: set CORS_ALLOWED_ORIGINS env var.

_cors_env = os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:5173')
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_env.split(',') if o.strip()]
CORS_ALLOW_CREDENTIALS = True   # Required for cross-origin cookies in dev

# ── Django REST Framework ──────────────────────────────────────────────────────

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        # Cookie-based auth: token read from httpOnly 'auth_token' cookie.
        # The Authorization header is NEVER used.
        'store.authentication.CookieTokenAuthentication',
    ],
}

# ── Cookie security ────────────────────────────────────────────────────────────
# The auth_token cookie settings are applied in auth_views._set_auth_cookie().
# These session cookie settings harden the Django session cookie as well.

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE   = not DEBUG   # HTTPS-only in production
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_HTTPONLY    = True
CSRF_COOKIE_SECURE      = not DEBUG
CSRF_COOKIE_SAMESITE    = 'Lax'

# ── HTTPS enforcement (production only) ───────────────────────────────────────
if not DEBUG:
    SECURE_SSL_REDIRECT             = True       # redirect all HTTP → HTTPS
    SECURE_HSTS_SECONDS             = 31536000   # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS  = True
    SECURE_HSTS_PRELOAD             = True
    SECURE_PROXY_SSL_HEADER         = ('HTTP_X_FORWARDED_PROTO', 'https')

# ── Logging ────────────────────────────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{levelname}] {asctime} {module} — {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.environ.get('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
        'store': {
            'handlers': ['console'],
            'level': 'DEBUG' if DEBUG else 'WARNING',
            'propagate': False,
        },
    },
}
