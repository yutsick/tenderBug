from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import (
    User, Department, PasswordResetToken, WorkType, WorkSubType, Equipment, 
    UserWork, TechnicType, InstrumentType, UserSpecification, UserEmployee, 
    UserOrder, UserTechnic, UserInstrument, UserPPE
)

# ===================================================================
# БАЗОВІ СЕРІАЛІЗАТОРИ (залишаються без змін)

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'description']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Реєстрація переможця тендеру"""
    class Meta:
        model = User
        fields = [
            'tender_number', 'department', 'company_name', 'edrpou', 
            'legal_address', 'actual_address', 'director_name', 
            'contact_person', 'email', 'phone'
        ]
    
    def validate_tender_number(self, value):
        if User.objects.filter(tender_number=value).exists():
            raise serializers.ValidationError("Тендер з таким номером вже існує в системі")
        return value
    
    def validate_edrpou(self, value):
        if value and len(value) not in [8, 10]:
            raise serializers.ValidationError("ЄДРПОУ має містити 8 або 10 цифр")
        return value
    
    def create(self, validated_data):
        user = User.objects.create(
            username=validated_data['tender_number'],
            **validated_data
        )
        user.set_unusable_password()
        user.save()
        return user


class UserActivationSerializer(serializers.Serializer):
    """Активація користувача через лінк"""
    activation_token = serializers.UUIDField()
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    username = serializers.CharField(required=False)
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Паролі не співпадають")
        
        try:
            validate_password(attrs['password'])
        except ValidationError as e:
            raise serializers.ValidationError(e.messages)
        
        return attrs


class UserLoginSerializer(serializers.Serializer):
    """Авторизація по email/username/tender_number"""
    username = serializers.CharField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if not username or not password:
            raise serializers.ValidationError('Необхідно вказати логін та пароль')
        
        # Пошук користувача
        user = None
        for field in ['email', 'username', 'tender_number']:
            try:
                user_obj = User.objects.get(**{field: username})
                if user_obj.check_password(password):
                    user = user_obj
                    break
            except User.DoesNotExist:
                continue
        
        if not user:
            raise serializers.ValidationError('Невірний логін або пароль')
            
        if not user.is_activated:
            raise serializers.ValidationError('Акаунт не активовано')
            
        if user.status in ['declined', 'blocked']:
            raise serializers.ValidationError('Акаунт заблоковано або відхилено')
        
        if user.is_staff:
            raise serializers.ValidationError('Співробітники повинні використовувати Django admin')
            
        attrs['user'] = user
        return attrs


class UserSerializer(serializers.ModelSerializer):
    """Основна інформація про користувача"""
    department_name = serializers.CharField(source='department.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'tender_number', 'company_name', 'edrpou', 'email', 'phone',
            'contact_person', 'department', 'department_name', 'status', 
            'status_display', 'is_activated', 'documents_folder',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tender_number', 'documents_folder', 'created_at']


class UserDetailSerializer(serializers.ModelSerializer):
    """Детальна інформація про користувача для адмінів"""
    department_name = serializers.CharField(source='department.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'tender_number', 'company_name', 'edrpou', 'legal_address',
            'actual_address', 'director_name', 'contact_person', 'email', 
            'phone', 'department', 'department_name', 'status', 'status_display',
            'is_activated', 'documents_folder', 'created_at', 'updated_at',
            'last_login'
        ]
        read_only_fields = ['id', 'tender_number', 'documents_folder', 'created_at']


# ===================================================================
# СПЕЦИФІКАЦІЯ РОБІТ (таб Роботи)

class UserSpecificationSerializer(serializers.ModelSerializer):
    """Серіалізатор для специфікації робіт користувача"""
    
    class Meta:
        model = UserSpecification
        fields = ['id', 'specification_type', 'created_at', 'updated_at']
        read_only_fields = ['user', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


# ===================================================================
# СПІВРОБІТНИКИ (таб Співробітники) - ВИПРАВЛЕНИЙ СЕРІАЛІЗАТОР

class UserEmployeeSerializer(serializers.ModelSerializer):
    """Серіалізатор для співробітників користувача"""
    photo_url = serializers.SerializerMethodField()
    qualification_certificate_url = serializers.SerializerMethodField()
    safety_training_certificate_url = serializers.SerializerMethodField()
    special_training_certificate_url = serializers.SerializerMethodField()
    
    class Meta:
        model = UserEmployee
        fields = [
            'id', 'name', 'photo', 'photo_url', 'medical_exam_date',
            'organization_name', 'position', 'qualification_certificate',
            'qualification_certificate_url', 'qualification_issue_date',
            'safety_training_certificate', 'safety_training_certificate_url',
            'safety_training_date', 'special_training_certificate',
            'special_training_certificate_url', 'special_training_date',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']
    
    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
        return None
    
    def get_qualification_certificate_url(self, obj):
        if obj.qualification_certificate:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.qualification_certificate.url)
        return None
    
    def get_safety_training_certificate_url(self, obj):
        if obj.safety_training_certificate:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.safety_training_certificate.url)
        return None
    
    def get_special_training_certificate_url(self, obj):
        if obj.special_training_certificate:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.special_training_certificate.url)
        return None
    
    def validate(self, data):
        """Валідація дат"""
        from django.utils import timezone
        today = timezone.now().date()
        
        # ДАТИ ЩО МАЮТЬ БУТИ В МАЙБУТНЬОМУ (терміни закінчення)
        future_fields = ['medical_exam_date', 'safety_training_date', 'special_training_date']
        
        for field in future_fields:
            if data.get(field) and data[field] <= today:
                raise serializers.ValidationError(
                    f"{field}: Дата закінчення дії має бути в майбутньому"
                )
        
        # ДАТИ ЩО МАЮТЬ БУТИ В МИНУЛОМУ (дати видачі)
        past_fields = ['qualification_issue_date']
        
        for field in past_fields:
            if data.get(field) and data[field] > today:
                raise serializers.ValidationError(
                    f"{field}: Дата видачі не може бути в майбутньому"
                )
        
        return data
    
    def create(self, validated_data):
        """Створення співробітника"""
        print(f"🔍 DEBUG CREATE: validated_data = {validated_data}")
        validated_data['user'] = self.context['request'].user
        
        # Очищуємо пусті дати
        date_fields = ['medical_exam_date', 'qualification_issue_date', 
                      'safety_training_date', 'special_training_date']
        for field in date_fields:
            if field in validated_data and not validated_data[field]:
                validated_data[field] = None
        
        instance = super().create(validated_data)
        print(f"✅ DEBUG CREATE: Created = {instance}")
        return instance


# ===================================================================
# НАКАЗИ (таб Накази)

class UserOrderSerializer(serializers.ModelSerializer):
    """Серіалізатор для наказів користувача"""
    order_type_display = serializers.CharField(source='get_order_type_display', read_only=True)
    display_title = serializers.CharField(read_only=True)  # НОВЕ ПОЛЕ
    documents_info = serializers.SerializerMethodField()
    
    class Meta:
        model = UserOrder
        fields = [
            'id', 'order_type', 'order_type_display', 'custom_title', 'display_title',
            'documents', 'documents_info', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']
    
    def get_documents_info(self, obj):
        """Повертає інформацію про завантажені файли з URL'ами"""
        if not obj.documents or not isinstance(obj.documents, list):
            return []
        
        request = self.context.get('request')
        documents_with_urls = []
        
        for doc in obj.documents:
            if isinstance(doc, dict):
                doc_info = doc.copy()
                if 'path' in doc_info and request:
                    file_path = doc_info['path']
                    if file_path.startswith('/media/'):
                        doc_info['url'] = request.build_absolute_uri(file_path)
                documents_with_urls.append(doc_info)
        
        return documents_with_urls
    
    def validate(self, attrs):
        """Валідація даних"""
        order_type = attrs.get('order_type')
        custom_title = attrs.get('custom_title', '').strip()
        
        # Для кастомних наказів обов'язково потрібна назва
        if order_type == 'custom' and not custom_title:
            raise serializers.ValidationError({
                'custom_title': 'Для кастомних наказів обов\'язково вказати назву'
            })
        
        # Для звичайних наказів custom_title має бути пустим
        if order_type != 'custom' and custom_title:
            raise serializers.ValidationError({
                'custom_title': 'Назва може бути вказана тільки для кастомних наказів'
            })
        
        return attrs
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

# ===================================================================
# ТЕХНІКА (таб Техніка)

class TechnicTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TechnicType
        fields = ['id', 'name', 'required_documents']


class UserTechnicSerializer(serializers.ModelSerializer):
    """Серіалізатор для техніки користувача"""
    technic_type_name = serializers.CharField(source='technic_type.name', read_only=True)
    display_name = serializers.CharField(read_only=True)
    documents_info = serializers.SerializerMethodField()
    required_documents = serializers.SerializerMethodField()
    
    class Meta:
        model = UserTechnic
        fields = [
            'id', 'technic_type', 'technic_type_name', 'custom_type',
            'display_name', 'documents', 'documents_info', 'required_documents',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']
    
    def get_documents_info(self, obj):
        if not obj.documents:
            return {}
        
        request = self.context.get('request')
        documents_with_urls = {}
        
        for doc_type, files in obj.documents.items():
            if isinstance(files, list):
                documents_with_urls[doc_type] = []
                for file_info in files:
                    file_data = file_info.copy()
                    if 'path' in file_data and request:
                        file_path = file_data['path']
                        if file_path.startswith('/media/'):
                            file_data['url'] = request.build_absolute_uri(file_path)
                    documents_with_urls[doc_type].append(file_data)
        
        return documents_with_urls
    
    def get_required_documents(self, obj):
        if obj.technic_type:
            return obj.technic_type.required_documents
        return []
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


# ===================================================================
# ІНСТРУМЕНТИ (таб Інструменти)

class InstrumentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstrumentType
        fields = ['id', 'name', 'required_documents']


class UserInstrumentSerializer(serializers.ModelSerializer):
    """Серіалізатор для інструментів користувача"""
    instrument_type_name = serializers.CharField(source='instrument_type.name', read_only=True)
    display_name = serializers.CharField(read_only=True)
    documents_info = serializers.SerializerMethodField()
    required_documents = serializers.SerializerMethodField()
    
    class Meta:
        model = UserInstrument
        fields = [
            'id', 'instrument_type', 'instrument_type_name', 'custom_type',
            'display_name', 'documents', 'documents_info', 'required_documents',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']
    
    def get_documents_info(self, obj):
        if not obj.documents:
            return {}
        
        request = self.context.get('request')
        documents_with_urls = {}
        
        for doc_type, files in obj.documents.items():
            if isinstance(files, list):
                documents_with_urls[doc_type] = []
                for file_info in files:
                    file_data = file_info.copy()
                    if 'path' in file_data and request:
                        file_path = file_data['path']
                        if file_path.startswith('/media/'):
                            file_data['url'] = request.build_absolute_uri(file_path)
                    documents_with_urls[doc_type].append(file_data)
        
        return documents_with_urls
    
    def get_required_documents(self, obj):
        if obj.instrument_type:
            return obj.instrument_type.required_documents
        return []
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


# ===================================================================
# ЗІЗ (таб ЗІЗ)

class UserPPESerializer(serializers.ModelSerializer):
    """Серіалізатор для ЗІЗ користувача"""
    documents_info = serializers.SerializerMethodField()
    
    class Meta:
        model = UserPPE
        fields = [
            'id', 'documents', 'documents_info', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']
    
    def get_documents_info(self, obj):
        if not obj.documents:
            return []
        
        request = self.context.get('request')
        documents_with_urls = []
        
        for doc in obj.documents:
            doc_info = doc.copy()
            if 'path' in doc_info and request:
                file_path = doc_info['path']
                if file_path.startswith('/media/'):
                    doc_info['url'] = request.build_absolute_uri(file_path)
            documents_with_urls.append(doc_info)
        
        return documents_with_urls
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


# ===================================================================
# ІНШІ СЕРІАЛІЗАТОРИ (роботи, аутентифікація тощо)

class WorkTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkType
        fields = ['id', 'name']


class WorkSubTypeSerializer(serializers.ModelSerializer):
    work_type_name = serializers.CharField(source='work_type.name', read_only=True)
    
    class Meta:
        model = WorkSubType
        fields = ['id', 'name', 'work_type', 'work_type_name', 'has_equipment']


class EquipmentSerializer(serializers.ModelSerializer):
    subtype_name = serializers.CharField(source='subtype.name', read_only=True)
    
    class Meta:
        model = Equipment
        fields = ['id', 'name', 'subtype', 'subtype_name']


class UserWorkSerializer(serializers.ModelSerializer):
    work_type_name = serializers.CharField(source='work_type.name', read_only=True)
    work_sub_type_name = serializers.CharField(source='work_sub_type.name', read_only=True)
    is_expired = serializers.SerializerMethodField()
    
    class Meta:
        model = UserWork
        fields = [
            'id', 'work_type', 'work_type_name', 'work_sub_type', 'work_sub_type_name',
            'expiry_date', 'permit_file', 'is_expired', 'created_at'
        ]
        read_only_fields = ['user']
    
    def get_is_expired(self, obj):
        from django.utils import timezone
        return obj.expiry_date < timezone.now().date()
    
    def validate(self, data):
        work_type = data.get('work_type')
        work_sub_type = data.get('work_sub_type')
        
        if work_sub_type and work_type and work_sub_type.work_type != work_type:
            raise serializers.ValidationError(
                "Підтип роботи не належить до обраного типу роботи"
            )
        
        from django.utils import timezone
        expiry_date = data.get('expiry_date')
        if expiry_date and expiry_date <= timezone.now().date():
            raise serializers.ValidationError(
                "Дата завершення дії повинна бути в майбутньому"
            )
        
        return data
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    password = serializers.CharField()
    password_confirm = serializers.CharField()
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Паролі не співпадають")
        
        try:
            validate_password(attrs['password'])
        except ValidationError as e:
            raise serializers.ValidationError(e.messages)
        
        return attrs