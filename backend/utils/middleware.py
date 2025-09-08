# backend/utils/middleware.py
import os
import mimetypes
from django.conf import settings
from django.http import HttpResponse, Http404
from django.utils.deprecation import MiddlewareMixin
from django.utils._os import safe_join

class MediaFileMiddleware(MiddlewareMixin):
    """
    Middleware для обслуговування медіа файлів у продакшені
    Працює навіть коли DEBUG=False
    """
    
    def process_request(self, request):
        """
        Перехоплюємо запити до медіа файлів і обслуговуємо їх
        """
        # Перевіряємо чи це запит до медіа файлу
        if not request.path.startswith(settings.MEDIA_URL):
            return None
            
        # Тільки для Railway або коли DEBUG=False
        if not (os.getenv('RAILWAY_ENVIRONMENT_NAME') or not settings.DEBUG):
            return None
        
        # Отримуємо шлях файлу
        file_path = request.path[len(settings.MEDIA_URL):]
        
        try:
            # Безпечно з'єднуємо шлях
            full_path = safe_join(settings.MEDIA_ROOT, file_path)
            
            # Перевіряємо існування файлу
            if not os.path.exists(full_path) or not os.path.isfile(full_path):
                raise Http404(f'File "{file_path}" not found')
            
            # Визначаємо тип контенту
            content_type, encoding = mimetypes.guess_type(full_path)
            content_type = content_type or 'application/octet-stream'
            
            # Читаємо і повертаємо файл
            with open(full_path, 'rb') as f:
                response = HttpResponse(f.read(), content_type=content_type)
                
            if encoding:
                response['Content-Encoding'] = encoding
                
            # Додаємо заголовки кешування для оптимізації
            response['Cache-Control'] = 'public, max-age=3600'  # 1 година
            
            return response
            
        except Exception as e:
            # Логуємо помилку для дебагу
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error serving media file {file_path}: {str(e)}")
            raise Http404(f'Error serving file: {str(e)}')