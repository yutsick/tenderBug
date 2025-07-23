from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()

class EmailOrUsernameBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        if not username or not password:
            return None
            
        # Спроба знайти користувача по username
        try:
            user = User.objects.get(username=username)
            if user.check_password(password):
                return user
        except User.DoesNotExist:
            pass
        
        # Спроба знайти по email
        try:
            user = User.objects.get(email=username)
            if user.check_password(password):
                return user
        except User.DoesNotExist:
            pass
            
        # Спроба знайти по tender_number
        try:
            user = User.objects.get(tender_number=username)
            if user.check_password(password):
                return user
        except User.DoesNotExist:
            pass
            
        return None