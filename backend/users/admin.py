# backend/users/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.contrib import messages
from django.conf import settings
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django import forms
from django_select2.forms import ModelSelect2Widget
from .models import User, Department, WorkType, WorkSubType, Equipment, UserWork, TechnicType, InstrumentType, UserSpecification, UserEmployee, UserOrder, UserTechnic, UserInstrument, UserPPE, Permit
from django.urls import reverse

def get_file_url(file_field):
    """Отримує URL файлу незалежно від формату зберігання"""
    try:
        if hasattr(file_field, 'url'):
            return file_field.url
        elif isinstance(file_field, str) and file_field.startswith('/'):
            return f"{settings.MEDIA_URL.rstrip('/')}{file_field}"
        elif isinstance(file_field, dict) and "url" in file_field:
            return file_field["url"]
        return None
    except:
        return None
    
@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'code']
    
    def get_queryset(self, request):
        """Адміни підрозділів не бачать інші підрозділи"""
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        # Звичайні адміни не можуть керувати підрозділами
        return qs.none()
    
    def has_add_permission(self, request):
        return request.user.is_superuser
    
    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


# Проксі моделі для розділення користувачів
class TenderUser(User):
    """Переможці тендерів (зареєстровані через фронтенд)"""
    class Meta:
        proxy = True
        verbose_name = "Переможець тендеру"
        verbose_name_plural = "Переможці тендерів"


class StaffUser(User):
    """Співробітники (адміни підрозділів)"""
    class Meta:
        proxy = True
        verbose_name = "Адміністратор підрозділу"
        verbose_name_plural = "Адміністратори підрозділів"


# Форми для створення адмінів підрозділів
class StaffUserCreationForm(UserCreationForm):
    """Форма створення адміністратора підрозділу"""
    email = forms.EmailField(required=True, label='Email')
    first_name = forms.CharField(max_length=150, required=True, label="Ім'я")
    last_name = forms.CharField(max_length=150, required=True, label='Прізвище')
    department = forms.ModelChoiceField(
        queryset=Department.objects.filter(is_active=True),
        required=True,
        label='Підрозділ'
    )
    tender_number = forms.CharField(
        max_length=100,
        required=True,
        label='Номер тендеру (для адміна)',
        help_text='Введіть унікальний номер, наприклад: ADMIN_SEEDS_001',
        initial='ADMIN_'
    )
    is_superuser = forms.BooleanField(
        required=False,
        label='Суперадміністратор',
        help_text='Суперадміністратори мають повний доступ до системи'
    )
    password1 = forms.CharField(
        label='Пароль',
        widget=forms.PasswordInput,
        help_text='Введіть пароль для нового адміністратора'
    )
    password2 = forms.CharField(
        label='Підтвердження паролю',
        widget=forms.PasswordInput,
        help_text='Введіть той же пароль для підтвердження'
    )
    def clean_password2(self):
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError("Паролі не співпадають")
        return password2
    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'tender_number', 'department', 'is_superuser')
    
    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        user.first_name = self.cleaned_data['first_name'] 
        user.last_name = self.cleaned_data['last_name']
        user.department = self.cleaned_data['department']
        user.tender_number = self.cleaned_data['tender_number']
        user.is_staff = True
        user.is_superuser = self.cleaned_data['is_superuser']
        user._from_admin = True  # Пропускаємо перевірку в save()
        
        user.set_password(self.cleaned_data["password1"])

        if commit:
            user.save()
        return user


class StaffUserChangeForm(UserChangeForm):
    """Форма редагування адміністратора підрозділу"""
    department = forms.ModelChoiceField(
        queryset=Department.objects.filter(is_active=True),
        required=False,
        label='Підрозділ'
    )
    
    class Meta:
        model = User
        fields = '__all__'

@admin.register(StaffUser)
class StaffUserAdmin(BaseUserAdmin):
    """
    ⭐ ГОЛОВНА ПАНЕЛЬ ДЛЯ СУПЕРАДМІНА
    Управління адміністраторами підрозділів
    """
    form = StaffUserChangeForm
    add_form = StaffUserCreationForm
    
    list_display = [
        'username', 'email', 'full_name', 'department_name', 
        'is_superuser_display', 'is_active', 'last_login', 'date_joined'
    ]
    list_filter = ['is_superuser', 'is_active', 'department', 'date_joined']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    
    fieldsets = (
        ('Основна інформація', {
            'fields': ('username', 'email', 'first_name', 'last_name')
        }),
        ('Підрозділ та права', {
            'fields': ('department', 'is_superuser', 'is_active')
        }),
        ('Пароль', {
            'fields': ('password',),
            'description': 'Для зміни паролю використовуйте відповідну форму.'
        }),
        ('Додаткова інформація', {
            'fields': ('last_login', 'date_joined'),
            'classes': ('collapse',)
        }),
    )
    
    add_fieldsets = (
        ('Створення адміністратора підрозділу', {
            'classes': ('wide',),
            'fields': ('username', 'email', 'first_name', 'last_name', 'department', 'tender_number', 'is_superuser', 'password1', 'password2'),
            'description': 'Створіть нового адміністратора підрозділу. Він матиме доступ до Django admin панелі.'
        }),
    )
    
    def get_queryset(self, request):
        """Показуємо тільки співробітників (is_staff=True)"""
        return super().get_queryset(request).filter(is_staff=True)
    
    # def get_form(self, request, obj=None, **kwargs):
    #     """Використовуємо різні форми для створення та редагування"""
    #     if obj is None:  # Створення нового
    #         kwargs['form'] = self.add_form
    #     return super().get_form(request, obj, **kwargs)
    
    def has_module_permission(self, request):
        """Тільки суперадмін може керувати співробітниками"""
        return request.user.is_superuser
    
    def has_add_permission(self, request):
        return request.user.is_superuser
    
    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
    
    def full_name(self, obj):
        """Повне ім'я співробітника"""
        if obj.first_name and obj.last_name:
            return f"{obj.first_name} {obj.last_name}"
        return obj.username
    full_name.short_description = "Повне ім'я"
    
    def department_name(self, obj):
        """Назва підрозділу"""
        return obj.department.name if obj.department else 'Не призначено'
    department_name.short_description = 'Підрозділ'
    
    def is_superuser_display(self, obj):
        """Відображення типу адміністратора"""
        if obj.is_superuser:
            return format_html('<span style="color: #ff4d4f; font-weight: bold;">👑 Суперадмін</span>')
        else:
            return format_html('<span style="color: #1890ff;">👤 Адмін підрозділу</span>')
    is_superuser_display.short_description = 'Тип'
    
    def save_model(self, request, obj, form, change):
        """Переконуємося, що створюємо співробітника правильно"""
        if not change:  # Новий користувач
            obj.is_staff = True
            obj._from_admin = True  # Щоб обійти перевірку в save()
            
        super().save_model(request, obj, form, change)
        
        # ✅ АВТОМАТИЧНО НАДАЄМО ПРАВА АДМІНУ ПІДРОЗДІЛУ:
        if not change and not obj.is_superuser:  # Тільки для нових адмінів підрозділів
            from django.contrib.auth.models import Permission
            from django.contrib.contenttypes.models import ContentType
            
            # Отримуємо ContentType для моделі User
            user_content_type = ContentType.objects.get_for_model(User)
            
            # Базові права для адміна підрозділу
            basic_permissions = [
                'view_user',           # Переглядати користувачів
                'change_user',         # Редагувати користувачів
                'view_tenderuser',     # Переглядати переможців тендерів
                'change_tenderuser',   # Редагувати переможців тендерів
            ]
            
            # Додаємо права
            for perm_codename in basic_permissions:
                try:
                    permission = Permission.objects.get(
                        codename=perm_codename,
                        content_type__app_label='users'
                    )
                    obj.user_permissions.add(permission)
                except Permission.DoesNotExist:
                    print(f"Permission {perm_codename} not found")
                    continue
            
            print(f"✅ Права надано адміну підрозділу: {obj.username}")


# ================ INLINE КЛАСИ ДЛЯ ПЕРЕГЛЯДУ ДАНИХ КАБІНЕТУ ================

# ================ СПЕЦИФІКАЦІЯ З РОБОТАМИ ТА ФАЙЛАМИ ================

class UserWorkInline(admin.TabularInline):
    """Роботи підвищеної небезпеки з дозволами"""
    model = UserWork
    extra = 0
    can_delete = False
    readonly_fields = ['work_type', 'work_sub_type', 'expiry_date', 'permit_file_link', 'is_expired_display', 'created_at']
    fields = ['work_type', 'work_sub_type', 'expiry_date', 'permit_file_link', 'is_expired_display', 'created_at']

    def permit_file_link(self, obj):
        """Кліковий лінк на файл дозволу"""
        if obj.permit_file:
            try:
                if hasattr(obj.permit_file, 'url'):
                    file_name = obj.permit_file.name.split('/')[-1] if obj.permit_file.name else "permit.pdf"
                    result = format_html(
                        '<a href="{}" target="_blank" style="color: #007cba; text-decoration: none;">📄 {}</a>',
                        obj.permit_file.url, file_name
                    )
                    return mark_safe(result)
                else:
                    return format_html('<span style="color: #52c41a;">📄 Дозвіл завантажено</span>')
            except:
                return format_html('<span style="color: #888;">📄 Файл недоступний</span>')
        return format_html('<span style="color: #ccc;">📄 Немає дозволу</span>')
    permit_file_link.short_description = 'Файл дозволу'

    def is_expired_display(self, obj):
        """Статус терміну дії"""
        if obj.is_expired:
            return format_html('<span style="color: #ff4d4f; font-weight: bold;">❌ Прострочено</span>')
        else:
            return format_html('<span style="color: #52c41a; font-weight: bold;">✅ Діє</span>')
    is_expired_display.short_description = 'Статус'

    def has_add_permission(self, request, obj=None):
        return False


class UserSpecificationInline(admin.StackedInline):
    """Специфікація робіт"""
    model = UserSpecification
    extra = 0
    max_num = 1
    can_delete = False
    readonly_fields = ['specification_type', 'works_summary', 'created_at', 'updated_at']
    fields = ['specification_type', 'works_summary', 'created_at', 'updated_at']

    def works_summary(self, obj):
        """Підсумок робіт підвищеної небезпеки З КЛІКОВИМИ ЛІНКАМИ"""
        try:
            works = obj.user.works.all()
            if works:
                works_html = []
                for work in works[:5]:  # Перші 5 робіт
                    # Статус терміну дії
                    if work.is_expired:
                        status = format_html('<span style="color: #ff4d4f; font-weight: bold;">❌</span>')
                    else:
                        status = format_html('<span style="color: #52c41a; font-weight: bold;">✅</span>')
                    
                    # КЛІКОВИЙ ЛІНК на файл дозволу
                    permit_link = ""
                    if work.permit_file:
                        try:
                            if hasattr(work.permit_file, 'url') and hasattr(work.permit_file, 'name'):
                                file_name = work.permit_file.name.split('/')[-1] if work.permit_file.name else "permit.pdf"
                                permit_link = format_html(' <a href="{}" target="_blank" style="color: #007cba; text-decoration: none; font-size: 11px;">📄 {}</a>', 
                                                        work.permit_file.url, file_name)
                        except:
                            permit_link = format_html(' <span style="color: #888; font-size: 11px;">📄 Файл</span>')
                    
                    # ВСЕ ЧЕРЕЗ format_html
                    work_line = format_html('{} <strong>{}</strong> (до {})', 
                                        status, 
                                        work.work_sub_type.name, 
                                        work.expiry_date.strftime("%d.%m.%Y"))
                    
                    # Об'єднуємо з лінком
                    if permit_link:
                        work_line = format_html('{}{}', work_line, permit_link)
                    
                    works_html.append(work_line)
                
                # ВСЕ ЧЕРЕЗ format_html
                works_joined = format_html('<br>'.join([str(work) for work in works_html]))
                
                extra_text = ""
                if works.count() > 5:
                    extra_text = format_html('<br><small style="color: #666;">... та ще {} робіт</small>', works.count() - 5)
                
                return format_html(
                    '<div style="background: #f6ffed; padding: 15px; border-radius: 6px; border-left: 4px solid #52c41a;">'
                    '<strong style="color: #52c41a;">⚡ {} робіт підвищеної небезпеки:</strong><br><br>{}{}'
                    '</div>',
                    works.count(), works_joined, extra_text
                )
            else:
                return format_html(
                    '<div style="background: #f5f5f5; padding: 15px; border-radius: 6px; border-left: 4px solid #d9d9d9;">'
                    '<span style="color: #999;">⚡ Роботи підвищеної небезпеки не додані</span>'
                    '</div>'
                )
        except Exception as e:
            return format_html('<span style="color: #ff4d4f;">Помилка: {}</span>', str(e))
    
    works_summary.short_description = 'Роботи підвищеної небезпеки'

    def has_add_permission(self, request, obj=None):
        return False
    
    works_summary.short_description = 'Роботи підвищеної небезпеки'

    def has_add_permission(self, request, obj=None):
        return False


class UserEmployeeInline(admin.TabularInline):
    """Співробітники"""
    model = UserEmployee
    extra = 0
    can_delete = False
    readonly_fields = ['name', 'photo_display', 'medical_exam_date', 'organization_name', 
                      'position', 'documents_info', 'created_at']
    
    fields = ['name', 'photo_display', 'medical_exam_date', 'organization_name',
              'position', 'documents_info', 'created_at']

    def photo_display(self, obj):
        if obj.photo:
            photo_url = get_file_url(obj.photo)
            if photo_url:
                return format_html(
                    '<a href="{}" target="_blank" style="color: #007cba; text-decoration: none;">📷 Фото</a>',
                    photo_url
                )
            return format_html('<span style="color: #52c41a;">📷 Фото є</span>')
        return format_html('<span style="color: #ccc;">📷 Немає</span>')
    photo_display.short_description = 'Фото'

    def documents_info(self, obj):
        docs = []
        
        # Кваліфікація
        if obj.qualification_certificate:
            qual_url = get_file_url(obj.qualification_certificate)
            if qual_url:
                docs.append(f'<a href="{qual_url}" target="_blank" style="color: #007cba; text-decoration: none;">📄 Кваліфікація</a>')
            else:
                docs.append("📄 Кваліфікація")
        
        # Безпека
        if obj.safety_training_certificate:
            safety_url = get_file_url(obj.safety_training_certificate)
            if safety_url:
                docs.append(f'<a href="{safety_url}" target="_blank" style="color: #007cba; text-decoration: none;">🛡️ Безпека</a>')
            else:
                docs.append("🛡️ Безпека")
        
        # Спеціальне навчання
        if obj.special_training_certificate:
            special_url = get_file_url(obj.special_training_certificate)
            if special_url:
                docs.append(f'<a href="{special_url}" target="_blank" style="color: #007cba; text-decoration: none;">⭐ Спец.навчання</a>')
            else:
                docs.append("⭐ Спец.навчання")
        
        if docs:
            return format_html('<div style="line-height: 1.4;">{}</div>'.format('<br>'.join(docs)))
        return format_html('<span style="color: #ccc;">Немає документів</span>')
    documents_info.short_description = 'Документи'

    def has_add_permission(self, request, obj=None):
        return False


class UserOrderInline(admin.TabularInline):
    """Накази"""
    model = UserOrder
    extra = 0
    can_delete = False
    readonly_fields = ['order_type',  'documents_preview', 'created_at']
    fields = ['order_type',  'documents_preview', 'created_at']

    def documents_count(self, obj):
        if obj.documents:
            try:
                count = len(obj.documents) if isinstance(obj.documents, list) else 0
                return format_html('<span style="color: #52c41a; font-weight: bold;">📁 {}</span>', count)
            except:
                return format_html('<span style="color: #888;">📁 Є документи</span>')
        return format_html('<span style="color: #ccc;">📁 0</span>')
    documents_count.short_description = 'К-сть'

    def documents_preview(self, obj):
        if obj.documents:
            try:
                if isinstance(obj.documents, list) and obj.documents:
                    links = []
                    for doc in obj.documents[:3]:  # Перші 3 файли
                        if isinstance(doc, dict):
                            file_name = doc.get("name", "Файл")
                            file_url = doc.get("path") or doc.get("url")
                            
                            if file_url:
                                # КЛІКОВИЙ ЛІНК ЧЕРЕЗ format_html
                                link = format_html('<a href="{}" target="_blank" style="color: #007cba; text-decoration: none;">📄 {}</a>', file_url, file_name)
                            else:
                                # ПРОСТО НАЗВА
                                link = format_html('📄 {}', file_name)
                            links.append(link)
                    
                    # Об'єднуємо готові HTML елементи
                    result = format_html('<br>'.join([str(link) for link in links]))
                    if len(obj.documents) > 3:
                        result += format_html('<br><small style="color: #666;">... та ще {} файлів</small>', len(obj.documents) - 3)
                    
                    return format_html('<div style="line-height: 1.4;">{}</div>', result)
            except Exception as e:
                print(f"DEBUG Накази: {e}")
                pass
        return format_html('<span style="color: #ccc;">—</span>')
    documents_preview.short_description = 'Файли'

    def has_add_permission(self, request, obj=None):
        return False


class UserTechnicInline(admin.TabularInline):
    """Техніка"""
    model = UserTechnic
    extra = 0
    can_delete = False
    readonly_fields = ['technic_display', 'documents_count', 'documents_links', 'created_at']
    fields = ['technic_display', 'documents_count', 'registration_number', 'documents_links', 'created_at']

    def technic_display(self, obj):
        if obj.technic_type:
            return format_html('<span style="color: #1890ff;">🚜 {}</span>', obj.technic_type.name)
        elif obj.custom_type:
            return format_html('<span style="color: #722ed1;">🔧 {} (власний)</span>', obj.custom_type)
        return 'Не вказано'
    technic_display.short_description = 'Техніка'

    def documents_count(self, obj):
        if obj.documents:
            try:
                total_docs = sum(len(files) for files in obj.documents.values() if isinstance(files, list))
                return format_html('<span style="color: #52c41a; font-weight: bold;">📁 {}</span>', total_docs)
            except:
                return format_html('<span style="color: #888;">📁 Є документи</span>')
        return format_html('<span style="color: #ccc;">📁 0</span>')
    documents_count.short_description = 'Документів'

    def documents_links(self, obj):
        """КЛІКОВІ ЛІНКИ на документи техніки"""
        if obj.documents:
            try:
                links = []
                for doc_type, files in obj.documents.items():
                    if isinstance(files, list) and files:
                        type_links = []
                        for file_info in files[:2]:  # Перші 2 файли кожного типу
                            if isinstance(file_info, dict):
                                file_name = file_info.get("name", "Файл")
                                file_path = file_info.get("path") or file_info.get("url")
                                
                                if file_path:
                                    # КЛІКОВИЙ ЛІНК ЧЕРЕЗ format_html
                                    link = format_html('<a href="{}" target="_blank" style="color: #007cba; text-decoration: none; font-size: 11px; display:inline-block; margin-bottom:10px">{}</a>', file_path, file_name)
                                else:
                                    # ПРОСТО НАЗВА
                                    link = format_html('<span style="font-size: 11px;">{}</span>', file_name)
                                type_links.append(link)
                        
                        if type_links:
                            if len(files) > 2:
                                type_links.append(format_html('<small style="color: #666;">+{}</small>', len(files) - 2))
                            
                            # Об'єднуємо лінки для одного типу документу
                            type_result = format_html('<strong style="color: #1890ff; font-size: 10px;">{}:</strong><br>{}', 
                                                    doc_type, 
                                                    format_html('<br>'.join([str(link) for link in type_links])))
                            links.append(type_result)
                
                if links:
                    return format_html('<div style="line-height: 1.3; max-width: 250px;">{}</div>', 
                                    format_html('<br><br>'.join([str(link) for link in links[:2]])))
            except Exception as e:
                print(f"DEBUG Техніка помилка: {e}")
                return format_html('<span style="color: #ff4d4f;">Помилка: {}</span>', str(e))
        return format_html('<span style="color: #ccc;">—</span>')
    documents_links.short_description = 'Файли'

    def has_add_permission(self, request, obj=None):
        return False


class UserInstrumentInline(admin.TabularInline):
    """Інструменти"""
    model = UserInstrument
    extra = 0
    can_delete = False
    readonly_fields = ['instrument_display', 'documents_count', 'documents_links', 'created_at']
    fields = ['instrument_display', 'documents_count', 'documents_links', 'created_at']

    def instrument_display(self, obj):
        if obj.instrument_type:
            return format_html('<span style="color: #722ed1;">🔨 {}</span>', obj.instrument_type.name)
        elif obj.custom_type:
            return format_html('<span style="color: #fa8c16;">⚒️ {} (власний)</span>', obj.custom_type)
        return 'Не вказано'
    instrument_display.short_description = 'Інструмент'

    def documents_count(self, obj):
        if obj.documents:
            try:
                total_docs = sum(len(files) for files in obj.documents.values() if isinstance(files, list))
                return format_html('<span style="color: #52c41a; font-weight: bold;">📁 {}</span>', total_docs)
            except:
                return format_html('<span style="color: #888;">📁 Є документи</span>')
        return format_html('<span style="color: #ccc;">📁 0</span>')
    documents_count.short_description = 'Документів'

    def documents_links(self, obj):
        """КЛІКОВІ ЛІНКИ на документи інструментів"""
        if obj.documents:
            try:
                links = []
                for doc_type, files in obj.documents.items():
                    if isinstance(files, list) and files:
                        type_links = []
                        for file_info in files[:2]:  # Перші 2 файли кожного типу
                            if isinstance(file_info, dict):
                                file_name = file_info.get("name", "Файл")
                                file_path = file_info.get("path") or file_info.get("url")
                                
                                if file_path:
                                    # КЛІКОВИЙ ЛІНК ЧЕРЕЗ format_html
                                    link = format_html('<a href="{}" target="_blank" style="color: #007cba; text-decoration: none; font-size: 11px;; display:inline-block; margin-bottom:10px">{}</a>', file_path, file_name)
                                else:
                                    # ПРОСТО НАЗВА
                                    link = format_html('<span style="font-size: 11px;">{}</span>', file_name)
                                type_links.append(link)
                        
                        if type_links:
                            if len(files) > 2:
                                type_links.append(format_html('<small style="color: #666;">+{}</small>', len(files) - 2))
                            
                            # Об'єднуємо лінки для одного типу документу
                            type_result = format_html('<strong style="color: #722ed1; font-size: 10px;">{}:</strong><br>{}', 
                                                    doc_type, 
                                                    format_html('<br>'.join([str(link) for link in type_links])))
                            links.append(type_result)
                
                if links:
                    return format_html('<div style="line-height: 1.3; max-width: 250px;">{}</div>', 
                                    format_html('<br><br>'.join([str(link) for link in links[:2]])))
            except Exception as e:
                print(f"DEBUG Інструменти помилка: {e}")
                return format_html('<span style="color: #ff4d4f;">Помилка: {}</span>', str(e))
        return format_html('<span style="color: #ccc;">—</span>')
    documents_links.short_description = 'Файли'

    def has_add_permission(self, request, obj=None):
        return False


class UserPPEInline(admin.StackedInline):
    """ЗІЗ - Засоби індивідуального захисту"""
    model = UserPPE
    extra = 0
    max_num = 1
    can_delete = False
    readonly_fields = ['documents_links', 'created_at', 'updated_at']
    fields = ['documents_links', 'created_at', 'updated_at']

    def documents_links(self, obj):
        """КЛІКОВІ ЛІНКИ на документи ЗІЗ"""
        if obj.documents:
            try:
                if isinstance(obj.documents, list):
                    count = len(obj.documents)
                    file_links = []
                    
                    for i, doc in enumerate(obj.documents[:5]):  # Перші 5 файлів
                        if isinstance(doc, dict):
                            file_name = doc.get("name", "Файл")
                            file_path = doc.get("path") or doc.get("url")
                            size = doc.get("size")
                            
                            if file_path:
                                # КЛІКОВИЙ ЛІНК З РОЗМІРОМ
                                if size:
                                    try:
                                        size_mb = round(int(size) / 1024 / 1024, 2)
                                        file_link = format_html('<a href="{}" target="_blank" style="color: #007cba; text-decoration: none; ; display:inline-block; margin-bottom:10px">📄 {}</a> <small style="color: #666;">({} MB)</small>', 
                                                            file_path, file_name, size_mb)
                                    except:
                                        file_link = format_html('<a href="{}" target="_blank" style="color: #007cba; text-decoration: none;">📄 {}</a>', 
                                                            file_path, file_name)
                                else:
                                    file_link = format_html('<a href="{}" target="_blank" style="color: #007cba; text-decoration: none;">📄 {}</a>', 
                                                        file_path, file_name)
                            else:
                                # ПРОСТО НАЗВА
                                file_link = format_html('📄 {}', file_name)
                            file_links.append(file_link)
                    
                    if file_links:
                        files_html = format_html('<br>'.join([str(link) for link in file_links]))
                        extra_info = ""
                        if count > 5:
                            extra_info = format_html('<br><br><small style="color: #666;">... та ще {} файлів</small>', count - 5)
                        
                        return format_html(
                            '<div style="background: #f6ffed; padding: 15px; border-radius: 6px; border-left: 4px solid #52c41a;">'
                            '<strong style="color: #52c41a;">🛡️ {} документів ЗІЗ:</strong><br><br>{}{}'
                            '</div>',
                            count, files_html, extra_info
                        )
            except Exception as e:
                print(f"DEBUG ЗІЗ помилка: {e}")
                return format_html(
                    '<div style="background: #fff7e6; padding: 15px; border-radius: 6px; border-left: 4px solid #faad14;">'
                    '<span style="color: #fa8c16;">🛡️ Помилка: {}</span>'
                    '</div>', str(e)
                )
        
        return format_html(
            '<div style="background: #f5f5f5; padding: 15px; border-radius: 6px; border-left: 4px solid #d9d9d9;">'
            '<span style="color: #999;">🛡️ Документи ЗІЗ відсутні</span>'
            '</div>'
        )
    
    documents_links.short_description = 'Документи ЗІЗ'

    def has_add_permission(self, request, obj=None):
        return False
    
@admin.register(TenderUser)
class TenderUserAdmin(admin.ModelAdmin):
    """Адмін панель для переможців тендерів"""
    list_display = [
        'tender_number', 'company_name', 'email', 'status_colored', 
        'department_name', 'access_status', 'activation_link_display', 'password_change_link', 'created_at'
    ]
    list_filter = ['status', 'is_activated', 'department']
    search_fields = ['tender_number', 'company_name', 'email', 'edrpou']
    readonly_fields = ['tender_number', 'created_at', 'updated_at', 'activation_token', 'activation_link_field', 'permits_section']
    actions = ['approve_users', 'decline_users', 'regenerate_activation_tokens']
    
    # Приховуємо системні поля Django
    exclude = [
        'groups', 'user_permissions', 'is_staff', 'is_superuser',
        'last_login', 'date_joined', 'is_active',
        'first_name', 'last_name', 'username'
    ]

    class Media:
        css = {
            'all': ('admin/css/tabs.css',)
        }
        js = ('admin/js/tabs.js', 'admin/js/permits.js', 'admin/js/custom.js')

    # ⭐ КЛЮЧОВІ ЗМІНИ: Різні права для різних користувачів
    def get_inlines(self, request, obj):
        """Суперадмін бачить всі деталі, адміни підрозділів - тільки базову інфо"""
        if request.user.is_superuser:
            # Суперадмін бачить ВСІ деталі
            return [
                UserSpecificationInline,
                UserEmployeeInline, 
                UserOrderInline,
                UserTechnicInline,
                UserInstrumentInline,
                UserPPEInline,
            ]
        else:
            # Адміни підрозділів НЕ БАЧАТЬ деталі документів
            return []
    
    def get_fieldsets(self, request, obj=None):
        """Різні fieldsets для різних користувачів"""
        if request.user.is_superuser:
            # Суперадмін бачить всі поля
            return (
                ('Основна інформація', {
                    'fields': ('tender_number', 'email', 'status', 'department')
                }),
                ('Дані компанії', {
                    'fields': ('company_name', 'edrpou', 'legal_address', 'actual_address', 
                              'director_name', 'contact_person', 'phone')
                }),
                ('Управління активацією', {
                    'fields': ('activation_link_field',),
                    'classes': ('wide',)
                }),
                ('Системна інформація', {
                    'fields': ('is_activated', 'activation_token', 'activation_expires', 'created_at', 'updated_at'),
                    'classes': ('collapse',)
                }),
                ('Перепустки', {  # ← ДОДАЙТЕ ЦЕ
                    'fields': ('permits_section',),
                    'classes': ('wide',)
                }),
            )
        else:
            # Адміни підрозділів бачать тільки базову інформацію + перепустки
            return (
                ('Основна інформація', {
                    'fields': ('tender_number', 'company_name', 'email', 'status', 'department')
                }),
                ('Контактна інформація', {
                    'fields': ('director_name', 'contact_person', 'phone'),
                    'classes': ('collapse',)
                }),
                ('Перепустки', {
                    'fields': ('permits_section',),
                    'classes': ('wide',)
                }),
            )

    def get_readonly_fields(self, request, obj=None):
        """Адміни підрозділів можуть редагувати тільки статус"""
        base_readonly = ['tender_number', 'created_at', 'updated_at', 'activation_token', 'permits_section']
        
        if request.user.is_superuser:
            # Суперадмін може редагувати все + бачить активацію
            return base_readonly + ['activation_link_field']
        else:
            # Адміни підрозділів - тільки статус можна змінювати
            return base_readonly + [
                'company_name', 'email', 'edrpou', 'legal_address', 'actual_address', 
                'director_name', 'contact_person', 'phone', 'department'
            ]

    def get_actions(self, request):
        """Адміни підрозділів мають обмежені дії"""
        actions = super().get_actions(request)
        
        if not request.user.is_superuser:
            # Залишаємо тільки схвалення/відхилення
            allowed_actions = ['approve_users', 'decline_users']
            actions = {key: value for key, value in actions.items() if key in allowed_actions}
        
        return actions

    def permits_section(self, obj):
    # Секція перепусток з повним управлінням для суперадміна і завантаженням для адмінів
        if not obj or not obj.pk:
            return "Інформація недоступна"
        
        request = getattr(self, '_current_request', None)
        permits_count = obj.permits.count() if hasattr(obj, 'permits') else 0
    
        if request and request.user.is_superuser:
            # СУПЕРАДМІН: повне управління (код залишається той же)
            if permits_count > 0:
                permits_list = []
                for permit in obj.permits.all():
                    if permit.employee:
                        subject_name = permit.employee.name
                    elif permit.technic:
                        subject_name = permit.technic.display_name
                    else:
                        subject_name = "Невідомо"
                    permit_info = f"{permit.permit_number} - {subject_name}"
                    
                    if permit.pdf_file:
                        download_link = f'<a href="{permit.pdf_file.url}" target="_blank" style="color: #007cba; text-decoration: none;">📄 {permit_info}</a>'
                    else:
                        download_link = f'📄 {permit_info}'
                    
                    delete_button = f'<a href="/admin/users/tenderuser/{permit.user.id}/delete-permit/{permit.id}/" style="color: #ff4d4f; margin-left: 10px; text-decoration: none;">🗑️ Видалити</a>'
                    
                    permits_list.append(f'{download_link}{delete_button}')
                
                permits_html = '<br>'.join(permits_list)
                permits_html = mark_safe(permits_html)

                result = format_html(
                    '<div style="background: #f6ffed; padding: 15px; border-radius: 6px; border-left: 4px solid #52c41a;">'
                    '<strong style="color: #52c41a;">📋 {} перепусток:</strong><br><br>{}<br><br>'
                    '<div style="border-top: 1px solid #d9d9d9; padding-top: 15px; margin-top: 15px;">'
                    '<strong>Управління:</strong><br><br>'
                    '<code style="background: #f5f5f5; padding: 8px; display: block; border-radius: 4px; font-family: monospace; margin-bottom: 8px;">'
                    'python manage.py generate_permits {} # Видалить старі і створить нові'
                    '</code>'
                    '</div>'
                    '</div>',
                    permits_count, permits_html, obj.tender_number
                )
                return mark_safe(result)
            else:
                # Код для генерації залишається той же...
                if obj.status == 'accepted':
                    result = format_html(
                    '<div style="background: #f0f8f0; padding: 15px; border-radius: 6px; border-left: 4px solid #52c41a;">'
                    '<strong style="color: #52c41a;">📋 Генерація перепусток</strong><br><br>'
                    '<p>Перепустки відсутні. Згенеруйте їх:</p>'
                    '<button type="button" onclick="generatePermits({})" id="generateBtn_{}" '
                    'style="background: #52c41a; color: white; border: none; padding: 10px 20px; '
                    'border-radius: 4px; cursor: pointer; font-weight: bold; margin: 10px 0;">'
                    '⚡ Згенерувати перепустки'
                    '</button>'
                    '<div id="generateResult_{}" style="margin-top: 10px;"></div>'
                    '</div>',
                    obj.id, obj.id, obj.id
                )
                    return mark_safe(result)
                else:
                    result = format_html(
                        '<div style="background: #fff7e6; padding: 15px; border-radius: 6px; border-left: 4px solid #faad14;">'
                        '<strong style="color: #fa8c16;">📋 Перепустки</strong><br><br>'
                        '<span style="color: #999;">Статус користувача має бути "Підтверджений" для генерації перепусток</span><br><br>'
                        '<small style="color: #666;">Поточний статус: {}</small>'
                        '</div>',
                        obj.get_status_display()
                    )
                    return mark_safe(result)
        else:
            # АДМІН ПІДРОЗДІЛУ: перегляд + завантаження
            if permits_count > 0:
                permits_list = []
                for permit in obj.permits.all():
                    if permit.employee:
                        subject_name = permit.employee.name
                    elif permit.technic:
                        subject_name = permit.technic.display_name
                    else:
                        subject_name = "Невідомо"
                    permit_info = f"{permit.permit_number} - {subject_name}"
                    if permit.pdf_file:
                        permits_list.append(
                            f'<a href="{permit.pdf_file.url}" target="_blank" style="color: #007cba; text-decoration: none;">📄 {permit_info}</a>'
                            f' <a href="{permit.pdf_file.url}" download style="color: #52c41a; margin-left: 8px; text-decoration: none;">⬇️ Скачати</a>'
                        )
                    else:
                        permits_list.append(f'📄 {permit_info} <span style="color: #ccc;">(файл відсутній)</span>')
                
                permits_html = '<br>'.join(permits_list)
                permits_html = mark_safe(permits_html)
                # Кнопка "Скачати всі" внизу
                download_all_url = f"/admin/users/tenderuser/{obj.id}/download-all-permits/"
                
                result = format_html(
                    '<div style="background: #f6ffed; padding: 15px; border-radius: 6px; border-left: 4px solid #52c41a;">'
                    '<strong style="color: #52c41a;">📋 {} перепусток:</strong><br><br>{}<br><br>'
                    '<div style="border-top: 1px solid #d9d9d9; padding-top: 15px; margin-top: 15px;">'
                    '<a href="{}" style="background: #52c41a; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold;">'
                    '📦 Скачати всі (ZIP)'
                    '</a>'
                    '</div>'
                    '</div>',
                    permits_count, permits_html, download_all_url
                )
            
                return mark_safe(result)
            else:
                result = format_html(
                    '<div style="background: #f5f5f5; padding: 15px; border-radius: 6px; border-left: 4px solid #d9d9d9;">'
                    '<strong style="color: #666;">📋 Перепустки</strong><br><br>'
                    '<span style="color: #999;">Перепустки на даний момент відсутні</span>'
                    '</div>'
                )
                return mark_safe(result)

    permits_section.short_description = 'Перепустки'
    permits_section.allow_tags = True

    def delete_permit_view(self, request, user_id, permit_id):
        """Видалення конкретної перепустки"""
        from django.shortcuts import redirect
        from django.contrib import messages
        from django.http import JsonResponse
        
        if not request.user.is_superuser:
            if request.method == 'DELETE':
                return JsonResponse({'error': 'Доступ заборонено'}, status=403)
            messages.error(request, 'Доступ заборонено')
            return redirect(f'/admin/users/tenderuser/{user_id}/change/')
        
        try:
            permit = Permit.objects.get(id=permit_id, user_id=user_id)
            
            if permit.employee:
                subject_name = permit.employee.name
            elif permit.technic:
                subject_name = permit.technic.display_name
            else:
                subject_name = "Невідомо"
                
            permit_info = f"{permit.permit_number} - {subject_name}"
            permit.delete()
            
            if request.method == 'DELETE':
                return JsonResponse({'success': True, 'message': f'Перепустку "{permit_info}" видалено'})
            else:
                messages.success(request, f'Перепустку "{permit_info}" видалено')
                
        except Permit.DoesNotExist:
            if request.method == 'DELETE':
                return JsonResponse({'error': 'Перепустку не знайдено'}, status=404)
            messages.error(request, 'Перепустку не знайдено')
        except Exception as e:
            if request.method == 'DELETE':
                return JsonResponse({'error': f'Помилка видалення: {str(e)}'}, status=500)
            messages.error(request, f'Помилка видалення: {str(e)}')
        
        if request.method == 'DELETE':
            return JsonResponse({'error': 'Невідома помилка'}, status=500)
        
        return redirect(f'/admin/users/tenderuser/{user_id}/change/')

    def generate_permits_ajax(self, request, object_id):
        """AJAX endpoint для генерації перепусток"""
        import json
        from django.http import JsonResponse
        from django.db import transaction
        from users.services.pdf_generator import PermitPDFGenerator
        
        # Перевіряємо права
        if not request.user.is_superuser:
            return JsonResponse({'error': 'Доступ заборонено'}, status=403)
        
        try:
            user = self.get_object(request, object_id)
            
            if user.status != 'accepted':
                return JsonResponse({
                    'error': f'Користувач має статус "{user.get_status_display()}". Потрібен статус "Підтверджений"'
                }, status=400)
            
            with transaction.atomic():
                # Видаляємо старі перепустки
                old_count = user.permits.count()
                user.permits.all().delete()
                
                generator = PermitPDFGenerator()
                created_permits = []
                
                # Створюємо для співробітників
                for employee in user.employees.all():
                    permit = Permit.objects.create(
                        user=user,
                        permit_number=Permit.generate_permit_number(user),
                        permit_type='employee',
                        employee=employee,
                        created_by=request.user
                    )
                    generator.generate_permit(permit)
                    permit.save()
                    created_permits.append({
                        'number': permit.permit_number,
                        'name': employee.name
                    })
                
                # Створюємо для техніки
                for technic in user.technics.all():
                    permit = Permit.objects.create(
                        user=user,
                        permit_number=Permit.generate_permit_number(user),
                        permit_type='technic',
                        technic=technic,
                        created_by=request.user
                    )
                    generator.generate_permit(permit)
                    permit.save()
                    created_permits.append({
                        'number': permit.permit_number,
                        'name': technic.display_name
                    })
                
                change_url = reverse('admin:users_tenderuser_change', args=[object_id])
                
                return JsonResponse({
                    'success': True,
                    'message': f'Успішно згенеровано {len(created_permits)} перепусток',
                    'deleted': old_count,
                    'created': len(created_permits),
                    'permits': created_permits,
                    'redirect_url': change_url
                })
                
        except Exception as e:
            return JsonResponse({'error': f'Помилка генерації: {str(e)}'}, status=500)

    def download_all_permits_view(self, request, object_id):
        """Завантаження всіх перепусток користувача в ZIP архіві"""
        import zipfile
        import io
        from django.http import HttpResponse
        
        # Отримуємо користувача
        try:
            user = self.get_object(request, object_id)
        except:
            from django.http import Http404
            raise Http404("Користувач не знайдений")
        
        # Перевіряємо права доступу
        if not request.user.is_staff:
            from django.core.exceptions import PermissionDenied
            raise PermissionDenied("Доступ заборонено")
        
        if not request.user.is_superuser:
            # Адміни підрозділів можуть завантажувати тільки з свого підрозділу
            if not hasattr(request.user, 'department') or user.department != request.user.department:
                from django.core.exceptions import PermissionDenied
                raise PermissionDenied("Ви можете завантажувати тільки перепустки свого підрозділу")
        
        permits = user.permits.all()
        
        if not permits.exists():
            from django.http import HttpResponseNotFound
            return HttpResponseNotFound("У користувача немає перепусток")
        
        # Створюємо ZIP архів в пам'яті
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for permit in permits:
                if permit.pdf_file:
                    try:
                        file_content = permit.pdf_file.read()
                        
                        if permit.employee:
                            subject_name = permit.employee.name
                        elif permit.technic:
                            subject_name = permit.technic.display_name
                        else:
                            subject_name = "Unknown"
                        
                        file_extension = permit.pdf_file.name.split('.')[-1] if '.' in permit.pdf_file.name else 'pdf'
                        file_name = f"{permit.permit_number}_{subject_name.replace(' ', '_')}.{file_extension}"
                        zip_file.writestr(file_name, file_content)
                    except Exception as e:
                        error_info = f"Помилка доступу до файлу {permit.permit_number}: {str(e)}"
                        zip_file.writestr(f"{permit.permit_number}_ERROR.txt", error_info.encode('utf-8'))
        
        zip_buffer.seek(0)
        
        # Відправляємо ZIP файл
        response = HttpResponse(
            zip_buffer.read(),
            content_type='application/zip'
        )
        response['Content-Disposition'] = f'attachment; filename="permits_{user.tender_number}_{user.company_name}.zip"'
        
        return response

    def get_urls(self):
        from django.urls import path
        urls = super().get_urls()
        custom_urls = [
            # ВАЖЛИВО: специфічніші URL мають йти ПЕРЕД загальними
            path('<int:user_id>/delete-permit/<int:permit_id>/', 
                self.admin_site.admin_view(self.delete_permit_view), 
                name='users_tenderuser_delete_permit'),
            path('<int:object_id>/download-all-permits/', 
                self.admin_site.admin_view(self.download_all_permits_view), 
                name='users_tenderuser_download_all_permits'),
            path('<int:object_id>/generate-permits-ajax/', 
                self.admin_site.admin_view(self.generate_permits_ajax), 
                name='users_tenderuser_generate_permits_ajax'),
        ]
        # ВАЖЛИВО: custom URLs мають йти ПЕРЕД стандартними
        return custom_urls + urls

    def changeform_view(self, request, object_id=None, form_url='', extra_context=None):
        """Зберігаємо request для використання в permits_section"""
        self._current_request = request
        return super().changeform_view(request, object_id, form_url, extra_context)
        
    def password_change_link(self, obj):
        if obj.pk:
            url = reverse('admin:users_tenderuser_change', args=[obj.pk])
            return format_html(
                '<a href="{}" style="color: #007cba; font-weight: bold;">✏️ Редагувати користувача</a>',
                url
            )
        return "-"
    password_change_link.short_description = 'Дії'

    def get_queryset(self, request):
        qs = super().get_queryset(request).filter(is_staff=False)  # Тільки переможці тендерів
        
        if request.user.is_superuser:
            # Суперадмін бачить всіх
            return qs
        elif request.user.is_staff and hasattr(request.user, 'department') and request.user.department:
            # Адмін підрозділу бачить тільки переможців зі свого підрозділу
            return qs.filter(department=request.user.department)
        else:
            # Якщо у адміна немає підрозділу - не бачить нікого
            return qs.none()
    
    def get_list_filter(self, request):
        """Адміни підрозділів не бачать фільтр по підрозділах"""
        filters = list(self.list_filter)
        if not request.user.is_superuser:
            # Прибираємо фільтр підрозділів для адмінів підрозділів
            filters = [f for f in filters if f != 'department']
        return filters
    
    def has_add_permission(self, request):
        """Тільки суперадмін може додавати переможців тендерів"""
        return request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        """Тільки суперадмін може видаляти"""
        return request.user.is_superuser
    
    def has_change_permission(self, request, obj=None):
        """Адмін може редагувати тільки користувачів зі свого підрозділу"""
        if request.user.is_superuser:
            return True
        if obj and hasattr(request.user, 'department'):
            return obj.department == request.user.department
        return False
    
    def department_name(self, obj):
        return obj.department.name if obj.department else '-'
    department_name.short_description = 'Підрозділ'
    
    def status_colored(self, obj):
        """Кольоровий статус"""
        colors = {
            'new': '#fa8c16',          # помаранчевий
            'in_progress': '#1890ff',   # синій  
            'pending': '#faad14',       # жовтий
            'accepted': '#52c41a',      # зелений
            'declined': '#ff4d4f',      # червоний
            'blocked': '#8c8c8c',       # сірий
        }
        color = colors.get(obj.status, '#000')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_status_display()
        )
    status_colored.short_description = 'Статус'
    
    def access_status(self, obj):
        """Доступ до фронтенду"""
        if obj.is_activated and obj.status in ['in_progress', 'pending', 'accepted']:
            return format_html('<span style="color: #52c41a;">✅ Має доступ</span>')
        else:
            return format_html('<span style="color: #ff4d4f;">❌ Немає доступу</span>')
    access_status.short_description = 'Доступ до кабінету'
    
    def activation_link_display(self, obj):
        """Спрощене відображення лінку активації"""
        if obj.status == 'in_progress' and obj.activation_token and not obj.is_activated:
            return format_html('<span style="color: #1890ff;">🔗 Є лінк</span>')
        elif obj.is_activated:
            return format_html('<span style="color: #52c41a;">✅ Активований</span>')
        elif obj.status == 'new':
            return format_html('<span style="color: #fa8c16;">⏳ Чекає схвалення</span>')
        else:
            return format_html('<span style="color: #8c8c8c;">—</span>')
    activation_link_display.short_description = 'Активація'
    
    def activation_link_field(self, obj):
        """Лінк активації для користувача"""
        if obj.activation_token:
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
            activation_url = f"{frontend_url}/activate/{obj.activation_token}"
            
            if obj.status == 'in_progress' and not obj.is_activated:
                return format_html(
                    '<div style="background: #f0f8f0; padding: 15px; border: 1px solid #52c41a; border-radius: 5px;">'
                    '<h4 style="color: #52c41a; margin-top: 0;">🔗 Лінк для активації</h4>'
                    '<p><strong>Надішліть цей лінк користувачу для активації акаунту:</strong></p>'
                    '<textarea readonly style="width: 95%; height: 60px; font-family: monospace; font-size: 12px; background: white; border: 1px solid #ddd; padding: 8px;">{}</textarea>'
                    '<br><br>'
                    '<button type="button" onclick="copyActivationLink(\'{}\'); return false;" '
                    'style="background: #52c41a; color: white; border: none; padding: 8px 16px; cursor: pointer; border-radius: 4px;">'
                    '📋 Копіювати лінк</button>'
                    '</div>',
                    activation_url, activation_url
                )
            elif obj.status == 'new':
                return format_html(
                    '<div style="background: #fff7e6; padding: 15px; border: 1px solid #faad14; border-radius: 5px;">'
                    '<h4 style="color: #fa8c16; margin-top: 0;">⏳ Очікує схвалення</h4>'
                    '<p>Користувач ще не схвалений. Змініть статус на "Допущений" для активації.</p>'
                    '</div>'
                )
            elif obj.is_activated:
                return format_html(
                    '<div style="background: #f6ffed; padding: 15px; border: 1px solid #52c41a; border-radius: 5px;">'
                    '<h4 style="color: #52c41a; margin-top: 0;">✅ Акаунт активований</h4>'
                    '<p>Користувач успішно активував свій акаунт і може працювати в системі.</p>'
                    '</div>'
                )
            elif obj.status == 'declined':
                return format_html(
                    '<div style="background: #fff2f0; padding: 15px; border: 1px solid #ff4d4f; border-radius: 5px;">'
                    '<h4 style="color: #ff4d4f; margin-top: 0;">❌ Заявка відхилена</h4>'
                    '<p>Заявка користувача була відхилена адміністратором.</p>'
                    '</div>'
                )
        return "Токен активації недоступний"
    
    activation_link_field.short_description = 'Управління активацією'


# Довідники

class SubtypeSelect2Widget(ModelSelect2Widget):
    model = WorkSubType
    search_fields = ['name__icontains', 'work_type__name__icontains']
    
    def label_from_instance(self, obj):
        return f"{obj.name} ({obj.work_type.name})"
    
    def build_attrs(self, base_attrs, extra_attrs=None):
        attrs = super().build_attrs(base_attrs, extra_attrs)
        attrs.update({
            'data-minimum-input-length': '0',  # Показувати весь список одразу
            'data-placeholder': 'Оберіть підтип робіт...',
            'data-allow-clear': 'true',
            'data-language': 'uk',
        })
        return attrs

class EquipmentForm(forms.ModelForm):
    class Meta:
        model = Equipment
        fields = '__all__'
        widgets = {
            'subtype': SubtypeSelect2Widget(attrs={
                'style': 'width: 100%;',
            })
        }
# Форма для inline
class EquipmentInlineForm(forms.ModelForm):
    class Meta:
        model = Equipment
        fields = '__all__'
        widgets = {
            'name': forms.Textarea(attrs={'rows': 2, 'cols': 60}),
        }

class EquipmentInline(admin.TabularInline):
    model = Equipment
    form = EquipmentInlineForm
    extra = 1

class WorkSubTypeInline(admin.TabularInline):
    model = WorkSubType
    extra = 1


class WorkTypeSelect2Widget(ModelSelect2Widget):
    model = WorkType
    search_fields = ['name__icontains']
    
    def build_attrs(self, base_attrs, extra_attrs=None):
        attrs = super().build_attrs(base_attrs, extra_attrs)
        attrs.update({
            'data-minimum-input-length': '0',
            'data-placeholder': 'Оберіть тип робіт...',
            'data-allow-clear': 'true',
            'data-language': 'uk',
        })
        return attrs

# Форма для WorkSubType
class WorkSubTypeForm(forms.ModelForm):
    class Meta:
        model = WorkSubType
        fields = '__all__'
        widgets = {
            'work_type': WorkTypeSelect2Widget(attrs={
                'style': 'width: 100%;',
            })
        }
        
@admin.register(WorkType)
class WorkTypeAdmin(admin.ModelAdmin):
    list_display = ('name',)
    inlines = [WorkSubTypeInline]

@admin.register(WorkSubType)
class WorkSubTypeAdmin(admin.ModelAdmin):
    form = WorkSubTypeForm
    list_display = ('name', 'work_type', 'has_equipment')
    list_filter = ('work_type', 'has_equipment')
    inlines = [EquipmentInline]

@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    form = EquipmentForm  # Додано форму з Select2
    list_display = ['id', 'name', 'subtype']
    list_filter = ['subtype__work_type', 'subtype']
    search_fields = ['name', 'subtype__name']
    
    class Media:
        css = {
            'all': (
                'admin/css/custom.css',
                'admin/css/select2-custom.css',
            )
        }

@admin.register(UserWork)
class UserWorkAdmin(admin.ModelAdmin):
    list_display = ['user', 'work_type', 'work_sub_type', 'expiry_date', 'is_expired_display', 'created_at']
    list_filter = ['work_type', 'work_sub_type', 'expiry_date', 'created_at']
    search_fields = ['user__company_name', 'user__email', 'work_type__name', 'work_sub_type__name']
    list_select_related = ['user', 'work_type', 'work_sub_type']
    raw_id_fields = ['user']
    readonly_fields = ['is_expired_display']
    
    def is_expired_display(self, obj):
        if obj.is_expired:
            return "❌ Закінчився"
        else:
            return "✅ Діє"
    is_expired_display.short_description = 'Статус'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if not request.user.is_superuser and hasattr(request.user, 'department') and request.user.department:
            # Адміни підрозділів бачать тільки роботи користувачів зі свого підрозділу
            qs = qs.filter(user__department=request.user.department)
        return qs
    

@admin.register(TechnicType)
class TechnicTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'documents_count', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name']
    readonly_fields = ['created_at']
    
    def documents_count(self, obj):
        return len(obj.required_documents)
    documents_count.short_description = 'К-сть документів'


@admin.register(InstrumentType)
class InstrumentTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'documents_count', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name']
    readonly_fields = ['created_at']
    
    def documents_count(self, obj):
        return len(obj.required_documents)
    documents_count.short_description = 'К-сть документів'

# Якщо потрібно - додати список перепусток в адмінку
# @admin.register(Permit)
# class PermitAdmin(admin.ModelAdmin):
#     list_display = ['permit_number', 'user_tender', 'permit_type', 'subject_name', 'created_at']
#     list_filter = ['permit_type', 'created_at', 'user__department']
#     readonly_fields = ['permit_number', 'created_at']
    
#     def user_tender(self, obj):
#         return f"{obj.user.tender_number} - {obj.user.company_name}"
#     user_tender.short_description = 'Переможець тендеру'
    
#     def subject_name(self, obj):
#         if obj.employee:
#             return obj.employee.name
#         elif obj.technic:
#             return obj.technic.display_name
#         return "Невідомо"
#     subject_name.short_description = 'На кого/що видано'
    
#     def has_add_permission(self, request):
#         return False  # Заборонити створення через admin
    
#     def get_queryset(self, request):
#         qs = super().get_queryset(request)
#         if request.user.is_superuser:
#             return qs
#         elif request.user.is_staff and hasattr(request.user, 'department'):
#             return qs.filter(user__department=request.user.department)
#         return qs.none()