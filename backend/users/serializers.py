# backend/users/serializers.py
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
# ВИПРАВЛЕНИЙ ІМПОРТ - видалено AdminDepartmentAccess
from .models import User, Department, PasswordResetToken


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
        """Перевірка унікальності номера тендеру"""
        if User.objects.filter(tender_number=value).exists():
            raise serializers.ValidationError("Тендер з таким номером вже існує в системі")
        return value
    
    def validate_edrpou(self, value):
        """Перевірка ЄДРПОУ"""
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
    login = serializers.CharField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        login = attrs.get('login')
        password = attrs.get('password')
        
        if not login or not password:
            raise serializers.ValidationError('Необхідно вказати логін та пароль')
        
        # Спробуємо знайти користувача по різних полях
        user = None
        
        # 1. По email
        try:
            user_obj = User.objects.get(email=login)
            if user_obj.check_password(password):
                user = user_obj
        except User.DoesNotExist:
            pass
        
        # 2. По username
        if not user:
            try:
                user_obj = User.objects.get(username=login)
                if user_obj.check_password(password):
                    user = user_obj
            except User.DoesNotExist:
                pass
        
        # 3. По tender_number
        if not user:
            try:
                user_obj = User.objects.get(tender_number=login)
                if user_obj.check_password(password):
                    user = user_obj
            except User.DoesNotExist:
                pass
        
        if not user:
            raise serializers.ValidationError('Невірний логін або пароль')
            
        if not user.is_activated:
            raise serializers.ValidationError('Акаунт не активовано')
            
        if user.status in ['declined', 'blocked']:
            raise serializers.ValidationError('Акаунт заблоковано або відхилено')
        
        # Перевірка що це не співробітник (переможці тендерів)
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


class PasswordResetRequestSerializer(serializers.Serializer):
    """Запит на відновлення паролю"""
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Підтвердження відновлення паролю"""
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