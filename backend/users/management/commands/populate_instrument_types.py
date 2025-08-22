# backend/users/management/commands/populate_instrument_types.py

import csv
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from users.models import InstrumentType


class Command(BaseCommand):
    help = 'Заповнює базу даних типами інструментів з CSV файлу (формат: "Вид","Інформація")'

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv-file',
            type=str,
            help='Шлях до CSV файлу з типами інструментів',
            default='data/instrument_types.csv'
        )

    def handle(self, *args, **options):
        csv_file = options['csv_file']
        
        # Шукаємо файл в різних місцях
        possible_paths = [
            csv_file,
            os.path.join(settings.BASE_DIR, csv_file),
            os.path.join(settings.BASE_DIR, 'data', 'instrument_types.csv'),
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
                reader = csv.DictReader(file)
                
                # Групуємо по типах інструментів
                grouped_data = {}
                parsed_count = 0
                
                for row in reader:
                    instrument_type = row.get('Вид', '').strip().strip('"')
                    document_name = row.get('Інформація', '').strip().strip('"')
                    
                    if not instrument_type or not document_name:
                        continue
                    
                    if instrument_type not in grouped_data:
                        grouped_data[instrument_type] = []
                    
                    grouped_data[instrument_type].append({
                        'name': document_name,
                        'is_multiple': False  # Для інструментів завжди false
                    })
                    
                    parsed_count += 1
                
                self.stdout.write(f'Розпарсили {parsed_count} записів')
                self.stdout.write(f'Знайдено {len(grouped_data)} унікальних типів інструментів')
                
                # Створюємо або оновлюємо записи
                for type_name, documents in grouped_data.items():
                    instrument_type, created = InstrumentType.objects.get_or_create(
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
                        if instrument_type.required_documents != documents:
                            instrument_type.required_documents = documents
                            instrument_type.save()
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
            example_type = InstrumentType.objects.first()
            if example_type:
                self.stdout.write(f'\nПриклад структури для "{example_type.name}":')
                for doc in example_type.required_documents:
                    self.stdout.write(f'  - {doc["name"]}')
