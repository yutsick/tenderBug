# backend/config/urls.py
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
from django.views.static import serve
import os

urlpatterns = [
    path('', RedirectView.as_view(url='/admin/', permanent=False)),
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('select2/', include('django_select2.urls')),
]

# ✅ ВИПРАВЛЕННЯ: Обслуговування медіа файлів
def custom_media_serve(request, path, document_root=None):
    """
    Кастомна функція для обслуговування медіа файлів
    Працює навіть коли DEBUG=False на Railway
    """
    import mimetypes
    from django.http import HttpResponse, Http404
    from django.utils._os import safe_join
    
    try:
        document_root = document_root or settings.MEDIA_ROOT
        fullpath = safe_join(document_root, path)
        
        if not os.path.exists(fullpath) or not os.path.isfile(fullpath):
            raise Http404(f'Media file "{path}" not found')
            
        # Визначаємо content type
        content_type, encoding = mimetypes.guess_type(fullpath)
        content_type = content_type or 'application/octet-stream'
        
        with open(fullpath, 'rb') as f:
            response = HttpResponse(f.read(), content_type=content_type)
            if encoding:
                response['Content-Encoding'] = encoding
            # Додаємо заголовки кешування
            response['Cache-Control'] = 'public, max-age=3600'  # 1 година
            return response
            
    except Exception as e:
        raise Http404(f'Error serving media file: {str(e)}')

# Завжди обслуговуємо медіа файли (і на Railway, і локально)
IS_RAILWAY = bool(os.getenv('RAILWAY_ENVIRONMENT_NAME'))

if IS_RAILWAY or not settings.DEBUG:
    # Продакшн - кастомне обслуговування
    urlpatterns += [
        re_path(r'^media/(?P<path>.*), custom_media_serve, {
            'document_root': settings.MEDIA_ROOT,
        }),
    ]
else:
    # Локальна розробка - стандартний спосіб
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)