# backend/users/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth import authenticate
from django.conf import settings
from django.utils import timezone
from datetime import datetime, timedelta
import uuid

# ВИПРАВЛЕНИЙ ІМПОРТ - видалено AdminDepartmentAccess
from .models import User, Department, PasswordResetToken
from .serializers import (
    UserRegistrationSerializer, 
    UserActivationSerializer,
    UserSerializer,
    DepartmentSerializer
)


class DepartmentListView(APIView):
    """Список підрозділів для реєстрації"""
    
    def get(self, request):
        departments = Department.objects.filter(is_active=True)
        serializer = DepartmentSerializer(departments, many=True)
        return Response({
            'count': len(serializer.data),
            'results': serializer.data
        })


class RegisterView(APIView):
    """Реєстрація переможців тендерів"""
    
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # КРИТИЧНО: Примусово встановлюємо обмеження доступу
            user.is_staff = False        # НЕ може заходити в Django admin
            user.is_superuser = False    # НЕ суперюзер
            user.is_active = True        # Але активний для API
            user.activation_expires = timezone.now() + timedelta(days=7)
            user.save()
            
            # Відправка email (зараз в консоль)
            activation_link = f"{settings.FRONTEND_URL}/activate/{user.activation_token}"
            print(f"Лінк активації для {user.email}: {activation_link}")
            
            return Response({
                'message': 'Користувач зареєстрований. Очікуйте схвалення адміністратора.',
                'activation_token': str(user.activation_token)  # Тільки для тестування
            }, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ActivateView(APIView):
    """Активація акаунту переможця тендеру"""
    
    def post(self, request):
        serializer = UserActivationSerializer(data=request.data)
        if serializer.is_valid():
            token = serializer.validated_data['activation_token']
            password = serializer.validated_data['password']
            username = serializer.validated_data.get('username')
            
            try:
                user = User.objects.get(
                    activation_token=token,
                    is_activated=False,
                    activation_expires__gt=timezone.now()
                )
                
                # Перевірка статусу
                if user.status != 'in_progress':
                    return Response({
                        'error': 'Ваш акаунт ще не схвалений адміністратором'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Активація
                user.set_password(password)
                user.is_activated = True
                
                if username:
                    user.username = username
                
                user.save()
                
                # Генерація токена для автоматичного логіну
                token, created = Token.objects.get_or_create(user=user)
                
                return Response({
                    'message': 'Акаунт активовано успішно',
                    'user': UserSerializer(user).data,
                    'token': token.key
                }, status=status.HTTP_200_OK)
                
            except User.DoesNotExist:
                return Response({
                    'error': 'Невірний або застарілий токен активації'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomAuthToken(ObtainAuthToken):
    """Кастомна авторизація по email/username/tender_number"""
    
    def post(self, request, *args, **kwargs):
        login = request.data.get('login')
        password = request.data.get('password')
        
        if not login or not password:
            return Response({
                'error': 'Необхідно вказати логін та пароль'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Спробуємо знайти користувача по різних полях
        user = None
        
        # По email
        try:
            user = User.objects.get(email=login)
        except User.DoesNotExist:
            pass
        
        # По username
        if not user:
            try:
                user = User.objects.get(username=login)
            except User.DoesNotExist:
                pass
        
        # По номеру тендеру
        if not user:
            try:
                user = User.objects.get(tender_number=login)
            except User.DoesNotExist:
                pass
        
        if not user:
            return Response({
                'error': 'Користувача з таким логіном не знайдено'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Перевірка пароля
        if not user.check_password(password):
            return Response({
                'error': 'Невірний пароль'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Перевірка активації
        if not user.is_activated:
            return Response({
                'error': 'Акаунт не активований'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Перевірка статусу
        if user.status not in ['in_progress', 'pending', 'accepted']:
            return Response({
                'error': 'Ваш акаунт заблокований або відхилений'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Генерація токена
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Вихід з системи"""
    try:
        request.user.auth_token.delete()
        return Response({'message': 'Успішно вийшли з системи'})
    except:
        return Response({'message': 'Помилка при виході'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile_view(request):
    """Профіль поточного користувача"""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


# API для адмінів підрозділів (тільки суперадмін та адміни можуть використовувати)
class UserListView(APIView):
    """Список користувачів для адмінів"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Тільки співробітники можуть бачити цей список
        if not request.user.is_staff:
            return Response({
                'error': 'Доступ заборонено'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Логіка фільтрації як в admin панелі
        users = User.objects.filter(is_staff=False)  # Тільки переможці тендерів
        
        if request.user.is_superuser:
            # Суперадмін бачить всіх
            pass
        elif hasattr(request.user, 'department') and request.user.department:
            # Адмін підрозділу бачить тільки свій підрозділ
            users = users.filter(department=request.user.department)
        else:
            # Якщо немає підрозділу - не бачить нікого
            users = User.objects.none()
        
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_user(request, user_id):
    """Схвалення користувача адміном"""
    if not request.user.is_staff:
        return Response({
            'error': 'Доступ заборонено'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        user = User.objects.get(id=user_id, is_staff=False)
        
        # Перевірка доступу адміна до цього користувача
        if not request.user.is_superuser:
            if not hasattr(request.user, 'department') or user.department != request.user.department:
                return Response({
                    'error': 'Ви не можете управляти цим користувачем'
                }, status=status.HTTP_403_FORBIDDEN)
        
        user.status = 'in_progress'
        user.activation_token = uuid.uuid4()
        user.activation_expires = timezone.now() + timedelta(days=7)
        user.save()
        
        return Response({
            'message': 'Користувача схвалено',
            'user': UserSerializer(user).data
        })
        
    except User.DoesNotExist:
        return Response({
            'error': 'Користувача не знайдено'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def decline_user(request, user_id):
    """Відхилення користувача адміном"""
    if not request.user.is_staff:
        return Response({
            'error': 'Доступ заборонено'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        user = User.objects.get(id=user_id, is_staff=False)
        
        # Перевірка доступу адміна до цього користувача
        if not request.user.is_superuser:
            if not hasattr(request.user, 'department') or user.department != request.user.department:
                return Response({
                    'error': 'Ви не можете управляти цим користувачем'
                }, status=status.HTTP_403_FORBIDDEN)
        
        user.status = 'declined'
        user.save()
        
        return Response({
            'message': 'Користувача відхилено',
            'user': UserSerializer(user).data
        })
        
    except User.DoesNotExist:
        return Response({
            'error': 'Користувача не знайдено'
        }, status=status.HTTP_404_NOT_FOUND)