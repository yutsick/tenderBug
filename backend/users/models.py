# backend/users/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import RegexValidator
from django.utils import timezone
import uuid
import os


class Department(models.Model):
    """Підрозділи"""
    name = models.CharField(max_length=255, verbose_name=_('Назва підрозділу'))
    code = models.CharField(max_length=50, unique=True, verbose_name=_('Код підрозділу'))
    description = models.TextField(blank=True, verbose_name=_('Опис'))
    is_active = models.BooleanField(default=True, verbose_name=_('Активний'))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('Підрозділ')
        verbose_name_plural = _('Підрозділи')
        ordering = ['name']

    def __str__(self):
        return self.name


class User(AbstractUser):
    """
    Розширена модель користувача
    Переможці тендерів: is_staff=False (реєстрація через фронтенд)
    Адміни підрозділів: is_staff=True (створюються через Django admin)
    """
    STATUS_CHOICES = [
        ('new', _('Новий')),  # Щойно зареєструвався
        ('in_progress', _('В процесі')),  # Акцептований, вносить дані
        ('pending', _('Очікує рішення')),  # Завантажив документи
        ('accepted', _('Підтверджений')),  # Допущений до роботи
        ('declined', _('Відхилений')),  # Відхилений
        ('blocked', _('Заблокований')),  # Заблокований
    ]

    email = models.EmailField(unique=True, verbose_name=_('Email'))
    phone = models.CharField(max_length=20, blank=True, verbose_name=_('Телефон'))

    # Дані юридичної особи
    company_name = models.CharField(max_length=500, blank=True, verbose_name=_('Назва компанії'))
    edrpou = models.CharField(
        max_length=10,
        blank=True,
        validators=[RegexValidator(r'^\d{8,10}$', 'ЄДРПОУ має містити 8-10 цифр')],
        verbose_name=_('ЄДРПОУ')
    )
    legal_address = models.TextField(blank=True, verbose_name=_('Юридична адреса'))
    actual_address = models.TextField(blank=True, verbose_name=_('Фактична адреса'))
    director_name = models.CharField(max_length=255, blank=True, verbose_name=_('ПІБ директора'))
    contact_person = models.CharField(max_length=255, blank=True, verbose_name=_('Контактна особа'))

    # Тендерна інформація
    tender_number = models.CharField(
        max_length=100,
        unique=True,
        verbose_name=_('Номер тендеру')
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('Підрозділ')
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='new',
        verbose_name=_('Статус')
    )

    # Активація акаунту
    is_activated = models.BooleanField(default=False, verbose_name=_('Активований'))
    activation_token = models.UUIDField(default=uuid.uuid4, verbose_name=_('Токен активації'))
    activation_expires = models.DateTimeField(null=True, blank=True, verbose_name=_('Токен діє до'))

    # Поля для синхронізації з 1С
    synced_to_1c = models.BooleanField(default=False, verbose_name=_('Синхронізовано з 1С'))
    sync_1c_id = models.CharField(max_length=50, blank=True, verbose_name=_('ID в 1С'))
    last_sync_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Остання синхронізація'))

    # Папка для документів
    documents_folder = models.CharField(max_length=255, blank=True, verbose_name=_('Папка документів'))

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        verbose_name = _('Користувач')
        verbose_name_plural = _('Користувачі')
        permissions = [
            ("view_own_department_users", "Can view users from own department"),
            ("change_own_department_users", "Can change users from own department"),
            ("approve_tender_users", "Can approve tender winners"),
            ("decline_tender_users", "Can decline tender winners"),
        ]

    def __str__(self):
        if self.is_staff:
            return f"Адмін: {self.email}"
        return f"{self.tender_number} - {self.company_name or self.email}"

    def save(self, *args, **kwargs):
        """
        Переконуємося, що користувачі з фронтенду НЕ мають доступу до admin
        """
        # Якщо це новий користувач без is_staff - це з фронтенду
        if not self.pk and not hasattr(self, '_from_admin'):
            # Користувачі з фронтенду НЕ можуть в admin
            self.is_staff = False
            self.is_superuser = False
            
        super().save(*args, **kwargs)

    @property
    def is_tender_winner(self):
        """Перевірка чи це переможець тендеру (зареєстрований через фронтенд)"""
        return not self.is_staff and not self.is_superuser

    @property
    def department_name(self):
        return self.department.name if self.department else ""

    def create_documents_folder(self):
        """Створення папки для документів"""
        if not self.documents_folder and self.tender_number:
            from django.conf import settings
            folder_name = f"tender_{self.tender_number}"
            folder_path = os.path.join(settings.MEDIA_ROOT, 'tenders', folder_name)

            # Створюємо папку якщо не існує
            os.makedirs(folder_path, exist_ok=True)

            self.documents_folder = folder_name
            self.save(update_fields=['documents_folder'])

        return self.documents_folder

    def get_documents_path(self):
        """Отримання повного шляху до папки документів"""
        if self.documents_folder:
            from django.conf import settings
            return os.path.join(settings.MEDIA_ROOT, 'tenders', self.documents_folder)
        return None


class PasswordResetToken(models.Model):
    """Токени для відновлення паролю"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    class Meta:
        verbose_name = _('Токен відновлення паролю')
        verbose_name_plural = _('Токени відновлення паролів')

    def is_valid(self):
        """Перевірка чи токен ще дійсний (24 години)"""
        from django.utils import timezone
        from datetime import timedelta
        return (
                not self.used and
                self.created_at > timezone.now() - timedelta(hours=24)
        )




class DocumentTab(models.Model):
    """Таби для завантаження документів"""
    name = models.CharField(max_length=255, verbose_name=_('Назва табу'))
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        verbose_name=_('Підрозділ')
    )
    order = models.PositiveIntegerField(default=0, verbose_name=_('Порядок відображення'))
    is_required = models.BooleanField(default=True, verbose_name=_('Обов\'язковий'))
    description = models.TextField(blank=True, verbose_name=_('Опис'))
    is_active = models.BooleanField(default=True, verbose_name=_('Активний'))

    class Meta:
        verbose_name = _('Таб документів')
        verbose_name_plural = _('Таби документів')
        ordering = ['department', 'order', 'name']

    def __str__(self):
        return f"{self.department.name} - {self.name}"


class DocumentField(models.Model):
    """Поля для завантаження документів у табі"""
    FIELD_TYPES = [
        ('file', _('Файл')),
        ('text', _('Текст')),
        ('number', _('Число')),
        ('date', _('Дата')),
        ('select', _('Вибір')),
    ]

    tab = models.ForeignKey(DocumentTab, on_delete=models.CASCADE, related_name='fields')
    name = models.CharField(max_length=255, verbose_name=_('Назва поля'))
    field_type = models.CharField(max_length=20, choices=FIELD_TYPES, verbose_name=_('Тип поля'))
    is_required = models.BooleanField(default=True, verbose_name=_('Обов\'язкове'))
    order = models.PositiveIntegerField(default=0, verbose_name=_('Порядок'))
    placeholder = models.CharField(max_length=255, blank=True, verbose_name=_('Підказка'))
    validation_rules = models.JSONField(blank=True, null=True, verbose_name=_('Правила валідації'))
    select_options = models.JSONField(blank=True, null=True, verbose_name=_('Варіанти вибору'))

    class Meta:
        verbose_name = _('Поле документа')
        verbose_name_plural = _('Поля документів')
        ordering = ['tab', 'order', 'name']

    def __str__(self):
        return f"{self.tab.name} - {self.name}"


class UserDocument(models.Model):
    """Документи/дані користувача"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name=_('Користувач'))
    tab = models.ForeignKey(DocumentTab, on_delete=models.CASCADE, verbose_name=_('Таб'))
    field = models.ForeignKey(DocumentField, on_delete=models.CASCADE, verbose_name=_('Поле'))

    # Значення залежно від типу поля
    text_value = models.TextField(blank=True, verbose_name=_('Текстове значення'))
    file_value = models.FileField(upload_to='temp/', blank=True, verbose_name=_('Файл'))
    number_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    date_value = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Документ користувача')
        verbose_name_plural = _('Документи користувачів')
        unique_together = ['user', 'field']

    def __str__(self):
        return f"{self.user.tender_number} - {self.field.name}"

    def save(self, *args, **kwargs):
        # Переміщуємо файл в правильну папку користувача
        if self.file_value and self.field.field_type == 'file':
            user_folder = self.user.create_documents_folder()
            if user_folder:
                # Логіка переміщення файлу в правильну папку
                pass
        super().save(*args, **kwargs)


class UserDocumentStatus(models.Model):
    """Статус завантаження документів по табах"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    tab = models.ForeignKey(DocumentTab, on_delete=models.CASCADE)
    is_completed = models.BooleanField(default=False, verbose_name=_('Завершено'))
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ['user', 'tab']
        verbose_name = _('Статус документів користувача')
        verbose_name_plural = _('Статуси документів користувачів')


# Довідники
class WorkType(models.Model):
    name = models.TextField(verbose_name="Тип робіт")

    def __str__(self):
        return self.name

class WorkSubType(models.Model):
    work_type = models.ForeignKey(WorkType, on_delete=models.CASCADE, related_name='subtypes')
    name = models.TextField(verbose_name="Підтип робіт")
    has_equipment = models.BooleanField(default=False, verbose_name="Потребує обладнання")

    def __str__(self):
        return f"{self.name} ({self.work_type.name})"

class Equipment(models.Model):
    subtype = models.ForeignKey(WorkSubType, on_delete=models.CASCADE, related_name='equipment')
    name = models.TextField(verbose_name="Обладнання")

    def __str__(self):
        return f"{self.name} - {self.subtype.name}"


class UserWork(models.Model):
    """Роботи користувача з дозволами та термінами дії"""
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='works',
        verbose_name='Користувач'
    )
    work_type = models.ForeignKey(
        WorkType, 
        on_delete=models.CASCADE, 
        verbose_name='Тип роботи'
    )
    work_sub_type = models.ForeignKey(
        WorkSubType, 
        on_delete=models.CASCADE, 
        verbose_name='Підтип роботи'
    )
    expiry_date = models.DateField('Дата завершення дії дозволу')
    permit_file = models.FileField(
        'Файл дозволу', 
        upload_to='permits/', 
        blank=True, 
        null=True
    )
    created_at = models.DateTimeField('Створено', auto_now_add=True)
    updated_at = models.DateTimeField('Оновлено', auto_now=True)
    
    class Meta:
        verbose_name = 'Робота користувача'
        verbose_name_plural = 'Роботи користувачів'
        ordering = ['-created_at']
        unique_together = ['user', 'work_sub_type']  # Один підтип на користувача
    
    def __str__(self):
        return f"{self.user.company_name} - {self.work_sub_type.name}"
    
    @property
    def is_expired(self):
        """Перевірка чи не закінчився термін дії дозволу"""
        
        return self.expiry_date < timezone.now().date()

# Довідники техніки та інструментів
class TechnicType(models.Model):
    """Типи техніки з необхідними документами"""
    name = models.CharField('Тип техніки', max_length=255)
    required_documents = models.JSONField('Необхідні документи', default=list)
    is_active = models.BooleanField('Активний', default=True)
    created_at = models.DateTimeField('Створено', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Тип техніки'
        verbose_name_plural = 'Типи техніки'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class InstrumentType(models.Model):
    """Типи інструментів з необхідними документами"""
    name = models.CharField('Вид інструменту', max_length=255)
    required_documents = models.JSONField('Необхідні документи', default=list)
    is_active = models.BooleanField('Активний', default=True)
    created_at = models.DateTimeField('Створено', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Тип інструменту'
        verbose_name_plural = 'Типи інструментів'
        ordering = ['name']
    
    def __str__(self):
        return self.name


# Моделі для збереження даних користувача
class UserSpecification(models.Model):
    """Специфікація робіт користувача (таб Роботи)"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='specification')
    specification_type = models.TextField(
        blank=True,
        verbose_name="Тип робіт за специфікацією"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Специфікація робіт"
        verbose_name_plural = "Специфікації робіт"
    
    def __str__(self):
        return f"Специфікація {self.user.company_name}"


class UserEmployee(models.Model):
    """Співробітники переможця тендеру"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='employees')
    name = models.CharField(max_length=255, verbose_name="ПІБ співробітника")
    photo = models.FileField(
        upload_to='employees/photos/', 
        blank=True, null=True,
        verbose_name="Фото співробітника"
    )
    medical_exam_date = models.DateField(
        blank=True, null=True,  # ✅ ДОЗВОЛИТИ NULL
        verbose_name="Дата медогляду"
    )
    organization_name = models.CharField(
        max_length=255, 
        blank=True,
        verbose_name="Назва організації що проводила медогляд"
    )
    position = models.CharField(
        max_length=255, 
        blank=True,
        verbose_name="Посада"
    )
    qualification_certificate = models.FileField(
        upload_to='employees/qualifications/', 
        blank=True, null=True,
        verbose_name="Посвідчення кваліфікації"
    )
    qualification_issue_date = models.DateField(
        blank=True, null=True,  # ✅ ДОЗВОЛИТИ NULL
        verbose_name="Дата видачі посвідчення"
    )
    safety_training_certificate = models.FileField(
        upload_to='employees/safety/', 
        blank=True, null=True,
        verbose_name="Посвідчення з охорони праці"
    )
    safety_training_date = models.DateField(
        blank=True, null=True,  # ✅ ВИПРАВЛЕНО: ДОЗВОЛИТИ NULL
        verbose_name="Дата навчання з охорони праці"
    )
    special_training_certificate = models.FileField(
        upload_to='employees/special/', 
        blank=True, null=True,
        verbose_name="Посвідчення спеціального навчання"
    )
    special_training_date = models.DateField(
        blank=True, null=True,  # ✅ ДОЗВОЛИТИ NULL 
        verbose_name="Дата спеціального навчання"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Співробітник"
        verbose_name_plural = "Співробітники"
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.user.company_name})"
    
class UserOrder(models.Model):
    """Накази користувача (таб Накази)"""
    ORDER_TYPES = [
        ('responsible_person', 'Про призначення відповідальних за організацію і безпечне виконання робіт підвищеної небезпеки'),
        ('fire_safety', 'Відповідальний за належний стан пожежної безпеки на об\'єкті виконання робіт'),
        ('eco_safety', 'Відповідальний за належний стан екологічної безпеки на об\'єкті виконання робіт'),
        ('certificates_protocols', 'Копії посвідчень та протоколів навчання і перевірки знань правил з охорони праці відповідальних осіб'),
        ('worker_training', 'Копії посвідчень та протоколів навчання і перевірки знань правил з охорони праці та навчання безпечним методам роботи працівників'),
        ('medical_conclusions', 'Медичні заключення про допуск до виконання робіт за зазначеними професіями'),
    ]
    
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='orders',
        verbose_name='Користувач'
    )
    order_type = models.CharField('Тип наказу', max_length=50, choices=ORDER_TYPES)
    documents = models.JSONField('Документи', default=list)  # Список файлів
    created_at = models.DateTimeField('Створено', auto_now_add=True)
    updated_at = models.DateTimeField('Оновлено', auto_now=True)
    
    class Meta:
        verbose_name = 'Наказ'
        verbose_name_plural = 'Накази'
        ordering = ['user', 'order_type']
    
    def __str__(self):
        return f"{self.user.tender_number} - {self.get_order_type_display()}"


class UserTechnic(models.Model):
    """Техніка користувача (таб Техніка)"""
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='technics',
        verbose_name='Користувач'
    )
    technic_type = models.ForeignKey(
        TechnicType, 
        on_delete=models.CASCADE, 
        verbose_name='Тип техніки',
        blank=True, null=True
    )
    custom_type = models.CharField('Інший тип (якщо не знайшли)', max_length=255, blank=True)
    documents = models.JSONField('Документи', default=dict)  # Структура: {тип_документу: [файли]}
    created_at = models.DateTimeField('Створено', auto_now_add=True)
    updated_at = models.DateTimeField('Оновлено', auto_now=True)
    
    class Meta:
        verbose_name = 'Техніка'
        verbose_name_plural = 'Техніка'
        ordering = ['user', '-created_at']
    
    def __str__(self):
        name = self.technic_type.name if self.technic_type else self.custom_type
        return f"{self.user.tender_number} - {name}"
    
    @property
    def display_name(self):
        return self.technic_type.name if self.technic_type else self.custom_type


class UserInstrument(models.Model):
    """Інструменти користувача (таб Інструменти)"""
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='instruments',
        verbose_name='Користувач'
    )
    instrument_type = models.ForeignKey(
        InstrumentType, 
        on_delete=models.CASCADE, 
        verbose_name='Тип інструменту',
        blank=True, null=True
    )
    custom_type = models.CharField('Інший тип (якщо не знайшли)', max_length=255, blank=True)
    documents = models.JSONField('Документи', default=dict)  # Структура: {тип_документу: [файли]}
    created_at = models.DateTimeField('Створено', auto_now_add=True)
    updated_at = models.DateTimeField('Оновлено', auto_now=True)
    
    class Meta:
        verbose_name = 'Інструмент'
        verbose_name_plural = 'Інструменти'
        ordering = ['user', '-created_at']
    
    def __str__(self):
        name = self.instrument_type.name if self.instrument_type else self.custom_type
        return f"{self.user.tender_number} - {name}"
    
    @property
    def display_name(self):
        return self.instrument_type.name if self.instrument_type else self.custom_type


class UserPPE(models.Model):
    """ЗІЗ користувача (таб ЗІЗ)"""
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='ppe',
        verbose_name='Користувач'
    )
    documents = models.JSONField('Документи ЗІЗ', default=list)  # Простий список файлів
    created_at = models.DateTimeField('Створено', auto_now_add=True)
    updated_at = models.DateTimeField('Оновлено', auto_now=True)
    
    class Meta:
        verbose_name = 'ЗІЗ'
        verbose_name_plural = 'ЗІЗ'
    
    def __str__(self):
        return f"{self.user.tender_number} - ЗІЗ"
    