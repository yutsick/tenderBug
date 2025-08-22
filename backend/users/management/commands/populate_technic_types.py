
import csv
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from users.models import TechnicType


class Command(BaseCommand):
    help = 'Заповнює базу даних типами техніки з CSV файлу (формат: "Тип","Інформація","isMulti")'

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv-file',
            type=str,
            help='Шлях до CSV файлу з типами техніки',
            default='data/technic_types.csv'
        )

    def handle(self, *args, **options):
        csv_file = options['csv_file']
        
        # Шукаємо файл в різних місцях
        possible_paths = [
            csv_file,
            os.path.join(settings.BASE_DIR, csv_file),
            os.path.join(settings.BASE_DIR, 'data', 'technic_types.csv'),
        ]
        
        csv_path = None
        for path in possible_paths:
            if os.path.exists(path):
                csv_path = path
                break
        
        if not csv_path:
            self.stdout.write(
                self.style.ERROR(f'CSV файл не знайдено. Спробовані шляхи: {possible_paths}')
            )
            return
        
        self.stdout.write(f'Читаємо CSV файл: {csv_path}')
        
        created_count = 0
        updated_count = 0
        
        try:
            with open(csv_path, 'r', encoding='utf-8') as file:
                # Використовуємо DictReader з обробкою лапок
                reader = csv.DictReader(file, quotechar='"')
                
                # Групуємо по типах техніки
                grouped_data = {}
                parsed_count = 0
                skipped_count = 0
                
                for row in reader:
                    # Безпечне очищення значень
                    def safe_clean(value):
                        if value is None:
                            return ''
                        return str(value).strip().strip('"')

                    technic_type = safe_clean(row.get('Тип'))
                    document_name = safe_clean(row.get('Інформація'))
                    is_multi_str = safe_clean(row.get('isMulti')).lower()
                                        
                    if not technic_type or not document_name:
                        skipped_count += 1
                        continue
                    
                    # Парсимо isMulti
                    is_multiple = is_multi_str == 'true'
                    
                    if technic_type not in grouped_data:
                        grouped_data[technic_type] = []
                    
                    grouped_data[technic_type].append({
                        'name': document_name,
                        'is_multiple': is_multiple
                    })
                    
                    parsed_count += 1
                
                self.stdout.write(f'Розпарсили {parsed_count} записів (пропущено {skipped_count})')
                self.stdout.write(f'Знайдено {len(grouped_data)} унікальних типів техніки')
                
                # Створюємо або оновлюємо записи
                for type_name, documents in grouped_data.items():
                    technic_type, created = TechnicType.objects.get_or_create(
                        name=type_name,
                        defaults={
                            'required_documents': documents,
                            'is_active': True
                        }
                    )
                    
                    if created:
                        created_count += 1
                        self.stdout.write(f'Створено: {type_name} ({len(documents)} документів)')
                    else:
                        # Оновлюємо документи якщо змінились
                        if technic_type.required_documents != documents:
                            technic_type.required_documents = documents
                            technic_type.save()
                            updated_count += 1
                            self.stdout.write(f'Оновлено: {type_name} ({len(documents)} документів)')
                        else:
                            self.stdout.write(f'Без змін: {type_name}')
        
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Помилка при читанні CSV: {e}')
            )
            return
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Завершено! Створено: {created_count}, Оновлено: {updated_count}'
            )
        )
        
        # Покажемо приклад структури даних
        if created_count > 0 or updated_count > 0:
            example_type = TechnicType.objects.first()
            if example_type:
                self.stdout.write(f'\nПриклад структури для "{example_type.name}":')
                for doc in example_type.required_documents:
                    multiple_text = " (можливо кілька)" if doc.get('is_multiple') else ""
                    self.stdout.write(f'  - {doc["name"]}{multiple_text}')

