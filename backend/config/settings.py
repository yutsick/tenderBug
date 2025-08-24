# backend/config/settings.py
from pathlib import Path
from decouple import config
import os

BASE_DIR = Path(__file__).resolve().parent.parent

# ---------- Environment ----------
ENV = os.getenv("DJANGO_ENV", "development").lower()
IS_RAILWAY = bool(os.getenv("RAILWAY_ENVIRONMENT_NAME"))
USE_REMOTE_DB = config('USE_REMOTE_DB', default=False, cast=bool)

# ---------- Security ----------
SECRET_KEY = config('SECRET_KEY', default='your-secret-key-here')

DEBUG = config('DEBUG', default=(ENV != 'production'), cast=bool)
if IS_RAILWAY or ENV == 'production':
    DEBUG = False

# ALLOWED_HOSTS
_allowed_hosts_env = config('ALLOWED_HOSTS', default='localhost,127.0.0.1')
ALLOWED_HOSTS = [s.strip() for s in _allowed_hosts_env.split(',') if s.strip()]
if IS_RAILWAY:
    ALLOWED_HOSTS += ['.railway.app']
ALLOWED_HOSTS = sorted({h for h in ALLOWED_HOSTS if h})

# ---------- Apps ----------
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'corsheaders',
    'rest_framework.authtoken',
    'django_select2',
]

LOCAL_APPS = [
    'users',
    'forms',
    'files',
    'sync_1c',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ---------- Middleware ----------
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ---------- Database ----------
pg_name = os.getenv('PGDATABASE') or os.getenv('DB_NAME', '')

use_pg = False
if (os.getenv('RAILWAY_ENVIRONMENT_NAME') or os.getenv('DJANGO_ENV') == 'production') and pg_name:
    use_pg = True
elif USE_REMOTE_DB and pg_name:
    use_pg = True

if use_pg:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': pg_name,
            'USER': os.getenv('PGUSER') or os.getenv('DB_USER', 'postgres'),
            'PASSWORD': os.getenv('PGPASSWORD') or os.getenv('DB_PASSWORD', ''),
            'HOST': os.getenv('PGHOST') or os.getenv('DB_HOST', 'localhost'),
            'PORT': os.getenv('PGPORT') or os.getenv('DB_PORT', '5432'),
            'OPTIONS': {'sslmode': os.getenv('DB_SSLMODE', 'require')},
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# ---------- Password validation ----------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ---------- I18N ----------
LANGUAGE_CODE = 'uk-ua'
TIME_ZONE = 'Europe/Kyiv'
USE_I18N = True
USE_TZ = True

# ---------- Static & Media ----------
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')] if os.path.isdir(os.path.join(BASE_DIR, 'static')) else []

# MEDIA налаштування - КЛЮЧОВЕ ВИПРАВЛЕННЯ
if IS_RAILWAY:
    # На Railway використовуємо volume
    MEDIA_ROOT = '/data/media'
    MEDIA_URL = '/media/'
else:
    # Локально
    MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
    MEDIA_URL = '/media/'

# Whitenoise для статики
if not DEBUG:
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ---------- URL Configuration for Media ----------
# Додаємо налаштування для обслуговування медіа файлів через Django
USE_DJANGO_MEDIA_HANDLER = IS_RAILWAY  # На Railway Django сам роздає медіа

# ---------- Defaults ----------
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ---------- DRF ----------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# ---------- CORS / CSRF ----------
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:3000')

if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
    CSRF_TRUSTED_ORIGINS = []
else:
    CORS_ALLOWED_ORIGINS = [FRONTEND_URL] if FRONTEND_URL else []
    if IS_RAILWAY:
        CORS_ALLOWED_ORIGINS += ['https://*.railway.app']
    CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS.copy()
    if IS_RAILWAY:
        CSRF_TRUSTED_ORIGINS += ['https://*.railway.app']

CORS_ALLOW_CREDENTIALS = True

# ---------- Auth ----------
AUTH_USER_MODEL = 'users.User'
AUTHENTICATION_BACKENDS = [
    'users.backends.EmailOrUsernameBackend',
    'django.contrib.auth.backends.ModelBackend',
]

# ---------- Upload limits ----------
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB

# ---------- Email ----------
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend' if DEBUG else 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@yoursite.com')

# ---------- Logging ----------
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {'level': 'INFO', 'class': 'logging.FileHandler', 'filename': 'django.log'},
        'console': {'level': 'INFO', 'class': 'logging.StreamHandler'},
    },
    'loggers': {
        'django': {'handlers': ['file', 'console'], 'level': 'INFO', 'propagate': True},
        'sync_1c': {'handlers': ['file', 'console'], 'level': 'INFO', 'propagate': True},
    },
}

# ---------- Security (Production) ----------
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# ---------- Debug Info ----------
if DEBUG:
    print(f"🐍 Django Settings:")
    print(f"  - Environment: {ENV}")
    print(f"  - Is Railway: {IS_RAILWAY}")
    print(f"  - DEBUG: {DEBUG}")
    print(f"  - MEDIA_ROOT: {MEDIA_ROOT}")
    print(f"  - Database: {'PostgreSQL' if use_pg else 'SQLite'}")