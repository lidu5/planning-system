from django.shortcuts import render
from rest_framework import viewsets, permissions
from .models import StateMinisterSector, Department, Indicator
from .serializers import StateMinisterSectorSerializer, DepartmentSerializer, IndicatorSerializer

class SuperuserWritePermission(permissions.BasePermission):
    def has_permission(self, request, view):
        # Read for authenticated users; write only for superusers
        if request.method in permissions.SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)

class SectorViewSet(viewsets.ModelViewSet):
    queryset = StateMinisterSector.objects.all().order_by('name')
    serializer_class = StateMinisterSectorSerializer
    permission_classes = [SuperuserWritePermission]
    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if getattr(user, 'is_superuser', False):
            return qs
        role = getattr(user, 'role', '').upper()
        if role == 'STATE_MINISTER':
            sector_id = getattr(getattr(user, 'sector', None), 'id', None) or getattr(user, 'sector', None)
            if sector_id:
                qs = qs.filter(id=sector_id)
        elif role == 'ADVISOR':
            # If advisor has department, scope to that department's sector
            dept = getattr(user, 'department', None)
            sector_id = getattr(getattr(dept, 'sector', None), 'id', None)
            if sector_id:
                qs = qs.filter(id=sector_id)
            else:
                # Fallback to user's sector field if present
                sector_id2 = getattr(getattr(user, 'sector', None), 'id', None) or getattr(user, 'sector', None)
                if sector_id2:
                    qs = qs.filter(id=sector_id2)
        return qs

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.select_related('sector').all().order_by('name')
    serializer_class = DepartmentSerializer
    permission_classes = [SuperuserWritePermission]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        sector_id = self.request.query_params.get('sector')
        if sector_id:
            qs = qs.filter(sector_id=sector_id)
        if getattr(user, 'is_superuser', False):
            return qs
        role = getattr(user, 'role', '').upper()
        if role == 'STATE_MINISTER':
            s_id = getattr(getattr(user, 'sector', None), 'id', None) or getattr(user, 'sector', None)
            if s_id:
                qs = qs.filter(sector_id=s_id)
        elif role == 'ADVISOR':
            d_id = getattr(getattr(user, 'department', None), 'id', None) or getattr(user, 'department', None)
            if d_id:
                qs = qs.filter(id=d_id)
            else:
                s_id = getattr(getattr(user, 'sector', None), 'id', None) or getattr(user, 'sector', None)
                if s_id:
                    qs = qs.filter(sector_id=s_id)
        return qs

class IndicatorViewSet(viewsets.ModelViewSet):
    queryset = Indicator.objects.select_related('department', 'department__sector').all().order_by('name')
    serializer_class = IndicatorSerializer
    permission_classes = [SuperuserWritePermission]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        department_id = self.request.query_params.get('department')
        if department_id:
            qs = qs.filter(department_id=department_id)
        if getattr(user, 'is_superuser', False):
            return qs
        role = getattr(user, 'role', '').upper()
        if role == 'STATE_MINISTER':
            s_id = getattr(getattr(user, 'sector', None), 'id', None) or getattr(user, 'sector', None)
            if s_id:
                qs = qs.filter(department__sector_id=s_id)
        elif role == 'ADVISOR':
            d_id = getattr(getattr(user, 'department', None), 'id', None) or getattr(user, 'department', None)
            if d_id:
                qs = qs.filter(department_id=d_id)
            else:
                s_id = getattr(getattr(user, 'sector', None), 'id', None) or getattr(user, 'sector', None)
                if s_id:
                    qs = qs.filter(department__sector_id=s_id)
        return qs

# Create your views here.
