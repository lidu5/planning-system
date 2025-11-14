from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets, permissions
from .models import User
from .serializers import UserSerializer

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {
            'username': user.username,
            'role': getattr(user, 'role', None),
            'is_superuser': getattr(user, 'is_superuser', False),
            'sector': getattr(user.sector, 'id', None),
            'sector_name': getattr(getattr(user, 'sector', None), 'name', None),
            'department': getattr(user.department, 'id', None),
            'department_name': getattr(getattr(user, 'department', None), 'name', None),
        }
        return Response(data)

class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related('sector', 'department').all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]

