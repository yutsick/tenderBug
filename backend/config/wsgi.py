import os
from django.core.wsgi import get_wsgi_application

# Автоматичне визначення середовища
if os.environ.get('RAILWAY_ENVIRONMENT') or os.environ.get('DATABASE_URL'):
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
else:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()