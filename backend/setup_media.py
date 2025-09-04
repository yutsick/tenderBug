# backend/setup_media.py
"""
Скрипт для створення медіа директорій та перевірки прав доступу
"""
import os
import sys
from pathlib import Path

def setup_media_directories(media_root):
    """Створює всі необхідні медіа директорії"""
    
    # Основні директорії для файлової системи тендерів
    directories = [
        'permits', 
        'employees',    # Фото та документи співробітників
        'technics',     # Документи техніки  
        'instruments',  # Сертифікати інструментів
        'orders',       # Наказні документи
        'ppe',          # Документи ЗІЗ
        'works',        # Дозволи на роботи
        'temp',         # Тимчасові файли
        'tenders',     # Файли тендерів
    ]
    
    try:
        # Створюємо кореневу директорію
        Path(media_root).mkdir(parents=True, exist_ok=True)
        print(f"✅ Створено медіа корінь: {media_root}")
        
        # Створюємо базову структуру для тендерів
        tenders_root = Path(media_root) / 'tenders'
        tenders_root.mkdir(exist_ok=True)
        print(f"✅ Створено папку тендерів: {tenders_root}")
        
        # Створюємо загальні директорії
        for directory in directories:
            dir_path = Path(media_root) / directory
            dir_path.mkdir(exist_ok=True)
            print(f"✅ Створено директорію: {dir_path}")
        
        # Перевіряємо права доступу
        test_file = Path(media_root) / 'test_write.txt'
        try:
            test_file.write_text('test')
            test_file.unlink()
            print(f"✅ Права на запис в {media_root} - OK")
        except Exception as e:
            print(f"❌ Помилка запису в {media_root}: {e}")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ Помилка створення директорій: {e}")
        return False

def main():
    """Основна функція"""
    # Отримуємо шлях до медіа з змінних середовища або використовуємо дефолт
    media_root = os.getenv('MEDIA_ROOT', '/data/media')
    
    print(f"🚀 Налаштування медіа директорій...")
    print(f"📁 Медіа корінь: {media_root}")
    print(f"🔧 Користувач: {os.getuid() if hasattr(os, 'getuid') else 'N/A'}")
    print(f"💾 Доступний простір: {os.statvfs(os.path.dirname(media_root)).f_bavail * os.statvfs(os.path.dirname(media_root)).f_frsize // (1024**3) if hasattr(os, 'statvfs') else 'N/A'} GB")
    
    if setup_media_directories(media_root):
        print(f"🎉 Налаштування завершено успішно!")
        
        # Виводимо підсумок
        print(f"\n📊 Підсумок:")
        print(f"  - Медіа корінь: {media_root}")
        print(f"  - Структура створена: ✅")
        print(f"  - Права доступу: ✅")
        
    else:
        print(f"💥 Налаштування завершилося з помилками!")
        sys.exit(1)

if __name__ == '__main__':
    main()