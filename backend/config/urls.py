# backend/config/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse
from django.views.generic import RedirectView

def health_check(request):
    """Health check endpoint для Railway"""
    return HttpResponse("OK", content_type="text/plain")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/', include('forms.urls')),
    path('api/', include('files.urls')),
    path('api/', include('sync_1c.urls')),
    
    # Health check
    path('health/', health_check, name='health_check'),
    path('', RedirectView.as_view(url='/admin/', permanent=False)),
]

# Обслуговування медіа файлів
# На Railway Django сам роздає медіа через volume
if settings.DEBUG or getattr(settings, 'USE_DJANGO_MEDIA_HANDLER', False):
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Для розробки також роздаємо статику
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)