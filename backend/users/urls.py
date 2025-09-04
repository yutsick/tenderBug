# backend/users/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Публічні endpoints
    path('departments/', views.DepartmentListView.as_view(), name='departments'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('activate/', views.ActivateView.as_view(), name='activate'),
    path('work-types/', views.WorkTypeListView.as_view(), name='work-types-list'),
    path('work-sub-types/', views.WorkSubTypeListView.as_view(), name='work-sub-types-list'),
    path('equipment/', views.EquipmentListView.as_view(), name='equipment-list'),
    path('user-works/', views.UserWorkListCreateView.as_view(), name='user-works-list'), 
    path('user-works/<int:pk>/', views.UserWorkDetailView.as_view(), name='user-works-detail'),
    # path('login/', views.CustomAuthToken.as_view(), name='login'),
    


    # Авторизовані endpoints
    path('login/', views.LoginView.as_view(), name='login'), 
    path('logout/', views.logout_view, name='logout'),
    path('profile/', views.user_profile_view, name='user-profile'),
    
    # Адмін endpoints (тільки для співробітників)
    path('users/', views.UserListView.as_view(), name='user-list'),
    path('users/<int:user_id>/approve/', views.approve_user, name='approve-user'),
    path('users/<int:user_id>/decline/', views.decline_user, name='decline-user'),

     #===================================================================
    # Довідники з детальною інформацією
    path('technic-types-detail/', views.TechnicTypeDetailListView.as_view(), name='technic-types-detail'),
    path('instrument-types-detail/', views.InstrumentTypeDetailListView.as_view(), name='instrument-types-detail'),
    
    # ===================================================================
    # Специфікація робіт (таб Роботи)
    path('user-specification/', views.UserSpecificationRetrieveUpdateView.as_view(), name='user-specification'),
    
    # ===================================================================
    # Співробітники (таб Співробітники)  
    path('user-employees/', views.UserEmployeeListCreateView.as_view(), name='user-employees-list'),
    path('user-employees/<int:pk>/', views.UserEmployeeDetailView.as_view(), name='user-employees-detail'),
    
    # ===================================================================
    # Накази (таб Накази)
    path('user-orders/', views.UserOrderListCreateView.as_view(), name='user-orders-list'),
    path('user-orders/<int:pk>/', views.UserOrderDetailView.as_view(), name='user-orders-detail'),
    path('order-types/', views.get_order_types, name='order-types'),
    
    # ===================================================================
    # Техніка (таб Техніка)
    path('user-technics/', views.UserTechnicListCreateView.as_view(), name='user-technics-list'),
    path('user-technics/<int:pk>/', views.UserTechnicDetailView.as_view(), name='user-technics-detail'),
    
    # ===================================================================
    # Інструменти (таб Інструменти)
    path('user-instruments/', views.UserInstrumentListCreateView.as_view(), name='user-instruments-list'),
    path('user-instruments/<int:pk>/', views.UserInstrumentDetailView.as_view(), name='user-instruments-detail'),
    
    # ===================================================================
    # ЗІЗ (таб ЗІЗ)
    path('user-ppe/', views.UserPPERetrieveUpdateView.as_view(), name='user-ppe'),
    
    # ===================================================================
    # Допоміжні endpoints
    path('upload-document/', views.upload_document, name='upload-document'),
    # ===================================================================
    path('admin/orders/', views.AdminOrderListView.as_view(), name='admin-orders'),
    path('admin/technics/', views.AdminTechnicListView.as_view(), name='admin-technics'),
    path('admin/employees/', views.AdminEmployeeListView.as_view(), name='admin-employees'),
    path('admin/instruments/', views.AdminInstrumentListView.as_view(), name='admin-instruments'),
    path('admin/ppe/', views.AdminPPEListView.as_view(), name='admin-ppe'),
    path('admin/specifications/', views.AdminSpecificationListView.as_view(), name='admin-specifications'),
   
]
