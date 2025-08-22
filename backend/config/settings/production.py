import os
import dj_database_url
from decouple import config
from .base import *

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = [
    '.railway.app',
    'localhost',
    '127.0.0.1',
]

# Database
DATABASE_URL = config('DATABASE_URL')
DATABASES = {
    'default': dj_database_url.parse(DATABASE_URL, conn_max_age=600)
}

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Whitenoise для статичних файлів
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# CORS settings for production
CORS_ALLOWED_ORIGINS = [
    "https://your-frontend-domain.vercel.app",  # Замініть на ваш frontend домен
]

CORS_ALLOW_CREDENTIALS = True

# Security settings
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True

# Email settings (для production використовуйте SMTP)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'  # Поки що консоль