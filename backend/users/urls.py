# backend/users/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Публічні endpoints
    path('departments/', views.DepartmentListView.as_view(), name='departments'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('activate/', views.ActivateView.as_view(), name='activate'),
    path('login/', views.CustomAuthToken.as_view(), name='login'),
    
    # Авторизовані endpoints
    path('logout/', views.logout_view, name='logout'),
    path('profile/', views.user_profile_view, name='user-profile'),
    
    # Адмін endpoints (тільки для співробітників)
    path('users/', views.UserListView.as_view(), name='user-list'),
    path('users/<int:user_id>/approve/', views.approve_user, name='approve-user'),
    path('users/<int:user_id>/decline/', views.decline_user, name='decline-user'),
]
