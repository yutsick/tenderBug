from django.core.management.base import BaseCommand
from django.db import transaction
from users.models import User, Permit
from users.services.pdf_generator import PermitPDFGenerator

class Command(BaseCommand):
    help = 'Генерує перепустки для користувача'
    
    def add_arguments(self, parser):
        parser.add_argument('tender_number', type=str, help='Номер тендеру')
    
    def handle(self, *args, **options):
        tender_number = options['tender_number']
        
        try:
            user = User.objects.get(tender_number=tender_number)
            
            if user.status != 'accepted':
                self.stdout.write(
                    self.style.ERROR(f'Користувач {tender_number} має статус "{user.status}", потрібен "accepted"')
                )
                return
            
            with transaction.atomic():
                # Видаляємо старі перепустки
                old_count = user.permits.count()
                user.permits.all().delete()
                if old_count > 0:
                    self.stdout.write(f'Видалено {old_count} старих перепусток')
                
                generator = PermitPDFGenerator()
                created_count = 0
                
                # Перепустки для працівників
                for employee in user.employees.all():
                    permit = Permit.objects.create(
                        user=user,
                        permit_number=Permit.generate_permit_number(user),
                        permit_type='employee',
                        employee=employee
                    )
                    generator.generate_permit(permit)
                    permit.save()
                    created_count += 1
                    self.stdout.write(f'✓ {permit.permit_number} - {employee.name}')
                
                # Перепустки для техніки
                for technic in user.technics.all():
                    permit = Permit.objects.create(
                        user=user,
                        permit_number=Permit.generate_permit_number(user),
                        permit_type='technic',
                        technic=technic
                    )
                    generator.generate_permit(permit)
                    permit.save()
                    created_count += 1
                    self.stdout.write(f'✓ {permit.permit_number} - {technic.display_name}')
                
                self.stdout.write(
                    self.style.SUCCESS(f'Створено {created_count} перепусток для {tender_number}')
                )
                
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Користувач з тендером {tender_number} не знайдений')
            )