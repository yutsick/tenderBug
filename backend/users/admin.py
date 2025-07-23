# backend/users/admin.py - ДОПОВНЕННЯ
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.contrib import messages
from django.conf import settings
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django import forms
from .models import User, Department


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
    is_superuser = forms.BooleanField(
        required=False,
        label='Суперадміністратор',
        help_text='Суперадміністратори мають повний доступ до системи'
    )
    
    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'department', 'is_superuser')
    
    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        user.first_name = self.cleaned_data['first_name'] 
        user.last_name = self.cleaned_data['last_name']
        user.department = self.cleaned_data['department']
        user.is_staff = True
        user.is_superuser = self.cleaned_data['is_superuser']
        user._from_admin = True  # Пропускаємо перевірку в save()
        
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


@admin.register(TenderUser)
class TenderUserAdmin(admin.ModelAdmin):
    """Адмін панель для переможців тендерів"""
    list_display = [
        'tender_number', 'company_name', 'email', 'status_colored', 
        'department_name', 'access_status', 'activation_link_display', 'created_at'
    ]
    list_filter = ['status', 'is_activated', 'department']
    search_fields = ['tender_number', 'company_name', 'email', 'edrpou']
    readonly_fields = ['tender_number', 'created_at', 'updated_at', 'activation_token', 'activation_link_field']
    actions = ['approve_users', 'decline_users', 'regenerate_activation_tokens']
    
    # Приховуємо системні поля Django
    exclude = [
        'groups', 'user_permissions', 'is_staff', 'is_superuser',
        'password', 'last_login', 'date_joined', 'is_active',
        'first_name', 'last_name', 'username'
    ]
    
    def get_queryset(self, request):
        """
        КЛЮЧОВА ЛОГІКА:
        - Суперадмін бачить всіх переможців тендерів
        - Адмін підрозділу бачить ТІЛЬКИ переможців зі СВОГО підрозділу
        """
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
                    '<textarea readonly style="width: 100%; height: 60px; font-family: monospace; font-size: 12px; background: white; border: 1px solid #ddd; padding: 8px;">{}</textarea>'
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
                    '<p>Користувач ще не схвалений. Змініть статус на "В процесі" для активації.</p>'
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
    
    # ... (всі методи approve_users, decline_users, etc. залишаються без змін)
    
    fieldsets = (
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
    )


@admin.register(StaffUser)
class StaffUserAdmin(admin.ModelAdmin):
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
            'fields': ('username', 'email', 'first_name', 'last_name', 'department', 'is_superuser', 'password1', 'password2'),
            'description': 'Створіть нового адміністратора підрозділу. Він матиме доступ до Django admin панелі.'
        }),
    )
    
    def get_queryset(self, request):
        """Показуємо тільки співробітників (is_staff=True)"""
        return super().get_queryset(request).filter(is_staff=True)
    
    def get_form(self, request, obj=None, **kwargs):
        """Використовуємо різні форми для створення та редагування"""
        if obj is None:  # Створення нового
            kwargs['form'] = self.add_form
        return super().get_form(request, obj, **kwargs)
    
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