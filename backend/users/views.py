# backend/users/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import generics
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth import authenticate
from django.conf import settings
from django.utils import timezone
from datetime import datetime, timedelta
from rest_framework.permissions import AllowAny
from .models import WorkType, WorkSubType, Equipment, UserWork
from .serializers import WorkTypeSerializer, WorkSubTypeSerializer, EquipmentSerializer, UserWorkSerializer
import uuid

# ВИПРАВЛЕНИЙ ІМПОРТ - видалено AdminDepartmentAccess
from .models import User, Department, PasswordResetToken, TechnicType, InstrumentType, UserSpecification, UserEmployee, UserOrder, UserTechnic, UserInstrument, UserPPE
from .serializers import (
    UserRegistrationSerializer, 
    UserActivationSerializer,
    UserSerializer,
    DepartmentSerializer,
    TechnicTypeSerializer, InstrumentTypeSerializer, UserSpecificationSerializer,
    UserEmployeeSerializer, UserOrderSerializer, UserTechnicSerializer,
    UserInstrumentSerializer, UserPPESerializer
)


class DepartmentListView(APIView):
    """Список підрозділів для реєстрації"""
    permission_classes = [AllowAny]
    def get(self, request):
        departments = Department.objects.filter(is_active=True)
        serializer = DepartmentSerializer(departments, many=True)
        return Response({
            'count': len(serializer.data),
            'results': serializer.data
        })

class LoginView(APIView):
    """Звичайний логін після активації"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response({'error': 'Необхідно вказати логін та пароль'}, status=400)
        
        # Пошук користувача по різних полях
        user = None
        
        # По email
        try:
            user_obj = User.objects.get(email=username, is_staff=False)
            if user_obj.check_password(password):
                user = user_obj
        except User.DoesNotExist:
            pass
        
        # По username
        if not user:
            try:
                user_obj = User.objects.get(username=username, is_staff=False)
                if user_obj.check_password(password):
                    user = user_obj
            except User.DoesNotExist:
                pass
        
        # По tender_number
        if not user:
            try:
                user_obj = User.objects.get(tender_number=username, is_staff=False)
                if user_obj.check_password(password):
                    user = user_obj
            except User.DoesNotExist:
                pass
        
        if not user:
            return Response({'error': 'Невірний логін або пароль'}, status=400)
        
        # Перевірки доступу
        if not user.is_activated:
            return Response({'error': 'Акаунт не активований'}, status=400)
        
        if user.status not in ['in_progress', 'pending', 'accepted']:
            return Response({'error': 'Доступ заборонено'}, status=403)
        
        # Генерація токена
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'tender_number': user.tender_number,
                'company_name': user.company_name,
                'status': user.status,
            }
        })
 
class RegisterView(APIView):
    """Реєстрація переможців тендерів"""
    permission_classes = [AllowAny] 
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
    permission_classes = [AllowAny]
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
    permission_classes = [AllowAny]
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

class WorkTypeListView(generics.ListAPIView):
    """API для отримання списку типів робіт"""
    queryset = WorkType.objects.all()
    serializer_class = WorkTypeSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Вимкнути пагінацію для невеликого списку


class WorkSubTypeListView(generics.ListAPIView):
    """API для отримання списку підтипів робіт (можна фільтрувати по work_type)"""
    queryset = WorkSubType.objects.select_related('work_type')
    serializer_class = WorkSubTypeSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    
    def get_queryset(self):
        queryset = super().get_queryset()
        work_type_id = self.request.query_params.get('work_type')
        
        if work_type_id:
            queryset = queryset.filter(work_type_id=work_type_id)
        
        return queryset


class EquipmentListView(generics.ListAPIView):
    """API для отримання списку обладнання (можна фільтрувати по subtype)"""
    queryset = Equipment.objects.select_related('subtype', 'subtype__work_type')
    serializer_class = EquipmentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    
    def get_queryset(self):
        queryset = super().get_queryset()
        subtype_id = self.request.query_params.get('subtype')
        
        if subtype_id:
            queryset = queryset.filter(subtype_id=subtype_id)
        
        return queryset


class UserWorkListCreateView(generics.ListCreateAPIView):
    """API для роботи з роботами користувача"""
    serializer_class = UserWorkSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return UserWork.objects.filter(user=self.request.user).select_related(
            'work_type', 'work_sub_type'
        )
    
    def perform_create(self, serializer):
        """Створення папок перед збереженням файлу"""
        user = self.request.user
        user.create_documents_folder()  # Створюємо папки
        serializer.save(user=user)


class UserWorkDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API для роботи з конкретною роботою користувача"""
    serializer_class = UserWorkSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return UserWork.objects.filter(user=self.request.user).select_related(
            'work_type', 'work_sub_type'
        )


#API для довідників (оновлені з детальною інформацією)

class TechnicTypeDetailListView(generics.ListAPIView):
    """API для отримання списку типів техніки з документами"""
    queryset = TechnicType.objects.filter(is_active=True)
    serializer_class = TechnicTypeSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None


class InstrumentTypeDetailListView(generics.ListAPIView):
    """API для отримання списку типів інструментів з документами"""
    queryset = InstrumentType.objects.filter(is_active=True)
    serializer_class = InstrumentTypeSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None


# ===================================================================
class UserOrderListCreateView(generics.ListCreateAPIView):
    """API для наказів - переможці бачать свої, адміни бачать всі"""
    serializer_class = UserOrderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_staff:
            # АДМІНИ БАЧАТЬ ВСІ НАКАЗИ
            if user.is_superuser:
                return UserOrder.objects.all().select_related('user', 'user__department').order_by('-created_at')
            elif hasattr(user, 'department') and user.department:
                return UserOrder.objects.filter(
                    user__department=user.department
                ).select_related('user', 'user__department').order_by('-created_at')
            else:
                return UserOrder.objects.all().select_related('user', 'user__department').order_by('-created_at')
        else:
            # ПЕРЕМОЖЦІ ТЕНДЕРІВ БАЧАТЬ ТІЛЬКИ СВОЇ
            return UserOrder.objects.filter(user=user).order_by('order_type')


class UserOrderDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API для детального перегляду наказу"""
    serializer_class = UserOrderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_staff:
            # АДМІНИ МОЖУТЬ ПРАЦЮВАТИ З УСІМА НАКАЗАМИ
            if user.is_superuser:
                return UserOrder.objects.all()
            elif hasattr(user, 'department') and user.department:
                return UserOrder.objects.filter(user__department=user.department)
            else:
                return UserOrder.objects.all()
        else:
            # ПЕРЕМОЖЦІ ТЕНДЕРІВ - ТІЛЬКИ СВОЇ
            return UserOrder.objects.filter(user=user)


# ===================================================================
# API для техніки (таб Техніка)

class UserTechnicListCreateView(generics.ListCreateAPIView):
    """API для техніки - переможці бачать свою, адміни бачать всю"""
    serializer_class = UserTechnicSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_staff:
            # АДМІНИ БАЧАТЬ ВСЮ ТЕХНІКУ
            if user.is_superuser:
                return UserTechnic.objects.all().select_related('user', 'user__department', 'technic_type').order_by('-created_at')
            elif hasattr(user, 'department') and user.department:
                return UserTechnic.objects.filter(
                    user__department=user.department
                ).select_related('user', 'user__department', 'technic_type').order_by('-created_at')
            else:
                return UserTechnic.objects.all().select_related('user', 'user__department', 'technic_type').order_by('-created_at')
        else:
            # ПЕРЕМОЖЦІ ТЕНДЕРІВ БАЧАТЬ ТІЛЬКИ СВОЮ
            return UserTechnic.objects.filter(user=user).order_by('-created_at')


# ===================================================================
# API для співробітників (таб Співробітники)

class UserEmployeeListCreateView(generics.ListCreateAPIView):
    """API для співробітників - переможці бачать своїх, адміни бачать всіх"""
    serializer_class = UserEmployeeSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_staff:
            # АДМІНИ БАЧАТЬ ВСІХ СПІВРОБІТНИКІВ
            if user.is_superuser:
                return UserEmployee.objects.all().select_related('user', 'user__department').order_by('-created_at')
            elif hasattr(user, 'department') and user.department:
                return UserEmployee.objects.filter(
                    user__department=user.department
                ).select_related('user', 'user__department').order_by('-created_at')
            else:
                return UserEmployee.objects.all().select_related('user', 'user__department').order_by('-created_at')
        else:
            # ПЕРЕМОЖЦІ ТЕНДЕРІВ БАЧАТЬ ТІЛЬКИ СВОЇХ
            return UserEmployee.objects.filter(user=user).order_by('-created_at')


# ===================================================================
# API для інструментів (таб Інструменти)

class UserInstrumentListCreateView(generics.ListCreateAPIView):
    """API для інструментів - переможці бачать свої, адміни бачать всі"""
    serializer_class = UserInstrumentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_staff:
            # АДМІНИ БАЧАТЬ ВСІ ІНСТРУМЕНТИ
            if user.is_superuser:
                return UserInstrument.objects.all().select_related('user', 'user__department', 'instrument_type').order_by('-created_at')
            elif hasattr(user, 'department') and user.department:
                return UserInstrument.objects.filter(
                    user__department=user.department
                ).select_related('user', 'user__department', 'instrument_type').order_by('-created_at')
            else:
                return UserInstrument.objects.all().select_related('user', 'user__department', 'instrument_type').order_by('-created_at')
        else:
            # ПЕРЕМОЖЦІ ТЕНДЕРІВ БАЧАТЬ ТІЛЬКИ СВОЇ
            return UserInstrument.objects.filter(user=user).order_by('-created_at')


# ===================================================================
# API для ЗІЗ (таб ЗІЗ)

class UserPPERetrieveUpdateView(generics.RetrieveUpdateAPIView):
    """API для ЗІЗ - GET і PATCH"""
    serializer_class = UserPPESerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        """Отримуємо або створюємо ЗІЗ для поточного користувача"""
        user = self.request.user
        
        if user.is_staff:
            from django.http import Http404
            raise Http404("Адміни не мають власних ЗІЗ")
        
        # Для переможців тендерів - get_or_create
        ppe, created = UserPPE.objects.get_or_create(
            user=user,
            defaults={'documents': []}
        )
        return ppe


# ===================================================================
# API для специфікації (таб Роботи)

class UserSpecificationRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    """API для специфікації - GET і PATCH"""
    serializer_class = UserSpecificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        """Отримуємо або створюємо специфікацію для поточного користувача"""
        user = self.request.user
        
        if user.is_staff:
            from django.http import Http404
            raise Http404("Адміни не мають власних специфікацій")
        
        # Для переможців тендерів - get_or_create
        specification, created = UserSpecification.objects.get_or_create(
            user=user,
            defaults={'specification_type': ''}
        )
        return specification

# ===================================================================
# Допоміжні API endpoints

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_document(request):
    """API для завантаження окремих документів"""
    if 'file' not in request.FILES:
        return Response(
            {'error': 'Файл не знайдено'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    file = request.FILES['file']
    document_type = request.data.get('document_type', 'general')
    
    # Створюємо папку користувача
    user_folder = request.user.create_documents_folder()
    
    # Формуємо шлях до файлу
    import os
    from django.conf import settings
    
    file_name = f"{document_type}_{file.name}"
    relative_path = f"tenders/{user_folder}/{document_type}/{file_name}"
    full_path = os.path.join(settings.MEDIA_ROOT, relative_path)
    
    # Створюємо підпапку якщо не існує
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    
    # Зберігаємо файл
    try:
        with open(full_path, 'wb+') as destination:
            for chunk in file.chunks():
                destination.write(chunk)
        
        return Response({
            'success': True,
            'file_info': {
                'name': file.name,
                'original_name': file.name,
                'path': f"/media/{relative_path}",
                'size': file.size,
                'document_type': document_type
            }
        })
    except Exception as e:
        return Response(
            {'error': f'Помилка завантаження файлу: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ОКРЕМІ API ДЛЯ АДМІНІВ - ТІЛЬКИ ПЕРЕГЛЯД ДАНИХ ПЕРЕМОЖЦІВ

class AdminOrderListView(generics.ListAPIView):
    """API для адмінів - перегляд всіх наказів переможців тендерів"""
    serializer_class = UserOrderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Тільки співробітники мають доступ
        if not user.is_staff:
            return UserOrder.objects.none()
        
        if user.is_superuser:
            return UserOrder.objects.all().select_related('user', 'user__department').order_by('-created_at')
        elif hasattr(user, 'department') and user.department:
            return UserOrder.objects.filter(
                user__department=user.department
            ).select_related('user', 'user__department').order_by('-created_at')
        else:
            return UserOrder.objects.all().select_related('user', 'user__department').order_by('-created_at')


class AdminTechnicListView(generics.ListAPIView):
    """API для адмінів - перегляд всієї техніки переможців тендерів"""
    serializer_class = UserTechnicSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if not user.is_staff:
            return UserTechnic.objects.none()
        
        if user.is_superuser:
            return UserTechnic.objects.all().select_related('user', 'user__department', 'technic_type').order_by('-created_at')
        elif hasattr(user, 'department') and user.department:
            return UserTechnic.objects.filter(
                user__department=user.department
            ).select_related('user', 'user__department', 'technic_type').order_by('-created_at')
        else:
            return UserTechnic.objects.all().select_related('user', 'user__department', 'technic_type').order_by('-created_at')


class AdminEmployeeListView(generics.ListAPIView):
    """API для адмінів - перегляд всіх співробітників переможців тендерів"""
    serializer_class = UserEmployeeSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if not user.is_staff:
            return UserEmployee.objects.none()
        
        if user.is_superuser:
            return UserEmployee.objects.all().select_related('user', 'user__department').order_by('-created_at')
        elif hasattr(user, 'department') and user.department:
            return UserEmployee.objects.filter(
                user__department=user.department
            ).select_related('user', 'user__department').order_by('-created_at')
        else:
            return UserEmployee.objects.all().select_related('user', 'user__department').order_by('-created_at')


class AdminInstrumentListView(generics.ListAPIView):
    """API для адмінів - перегляд всіх інструментів переможців тендерів"""
    serializer_class = UserInstrumentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if not user.is_staff:
            return UserInstrument.objects.none()
        
        if user.is_superuser:
            return UserInstrument.objects.all().select_related('user', 'user__department', 'instrument_type').order_by('-created_at')
        elif hasattr(user, 'department') and user.department:
            return UserInstrument.objects.filter(
                user__department=user.department
            ).select_related('user', 'user__department', 'instrument_type').order_by('-created_at')
        else:
            return UserInstrument.objects.all().select_related('user', 'user__department', 'instrument_type').order_by('-created_at')


class AdminPPEListView(generics.ListAPIView):
    """API для адмінів - перегляд всіх ЗІЗ переможців тендерів"""
    serializer_class = UserPPESerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if not user.is_staff:
            return UserPPE.objects.none()
        
        if user.is_superuser:
            return UserPPE.objects.all().select_related('user', 'user__department')
        elif hasattr(user, 'department') and user.department:
            return UserPPE.objects.filter(
                user__department=user.department
            ).select_related('user', 'user__department')
        else:
            return UserPPE.objects.all().select_related('user', 'user__department')


class AdminSpecificationListView(generics.ListAPIView):
    """API для адмінів - перегляд всіх специфікацій переможців тендерів"""
    serializer_class = UserSpecificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if not user.is_staff:
            return UserSpecification.objects.none()
        
        if user.is_superuser:
            return UserSpecification.objects.all().select_related('user', 'user__department')
        elif hasattr(user, 'department') and user.department:
            return UserSpecification.objects.filter(
                user__department=user.department
            ).select_related('user', 'user__department')
        else:
            return UserSpecification.objects.all().select_related('user', 'user__department')


# ДОДАТИ ЦІ КЛАСИ В backend/users/views.py (в кінець файлу):

# ===================================================================
# НЕДОСТАЮЧІ DETAIL VIEWS

class UserEmployeeDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API для детального перегляду співробітника"""
    serializer_class = UserEmployeeSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_staff:
            # АДМІНИ МОЖУТЬ ПРАЦЮВАТИ З УСІМА СПІВРОБІТНИКАМИ
            if user.is_superuser:
                return UserEmployee.objects.all()
            elif hasattr(user, 'department') and user.department:
                return UserEmployee.objects.filter(user__department=user.department)
            else:
                return UserEmployee.objects.all()
        else:
            # ПЕРЕМОЖЦІ ТЕНДЕРІВ - ТІЛЬКИ СВОЇ
            return UserEmployee.objects.filter(user=user)


class UserTechnicDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API для детального перегляду техніки"""
    serializer_class = UserTechnicSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_staff:
            if user.is_superuser:
                return UserTechnic.objects.all()
            elif hasattr(user, 'department') and user.department:
                return UserTechnic.objects.filter(user__department=user.department)
            else:
                return UserTechnic.objects.all()
        else:
            return UserTechnic.objects.filter(user=user)


class UserInstrumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API для детального перегляду інструменту"""
    serializer_class = UserInstrumentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_staff:
            if user.is_superuser:
                return UserInstrument.objects.all()
            elif hasattr(user, 'department') and user.department:
                return UserInstrument.objects.filter(user__department=user.department)
            else:
                return UserInstrument.objects.all()
        else:
            return UserInstrument.objects.filter(user=user)


# ТАКОЖ ДОДАТИ ФУНКЦІЮ ДЛЯ ORDER TYPES:

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_order_types(request):
    """API для отримання списку типів наказів"""
    order_types = [
        {'value': choice[0], 'label': choice[1]}
        for choice in UserOrder.ORDER_TYPES
    ]
    return Response(order_types) 

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