from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets, permissions
from django.db.models import Sum, Count
from .models import User
from .serializers import UserSerializer
from indicators.models import Indicator, StateMinisterSector, Department
from plans.models import AnnualPlan


class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)

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


class AdminTargetsBySectorView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        # Sum of AnnualPlan.target grouped by Sector
        qs = (
            AnnualPlan.objects
            .select_related('indicator__department__sector')
            .values('indicator__department__sector__name')
            .annotate(total=Sum('target'))
            .order_by('indicator__department__sector__name')
        )
        data = [
            {
                'sector': row['indicator__department__sector__name'] or 'Unassigned',
                'total': float(row['total'] or 0),
            }
            for row in qs
        ]
        return Response(data)


class AdminIndicatorsByDepartmentView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        # Number of indicators per Department
        qs = (
            Indicator.objects
            .select_related('department')
            .values('department__name')
            .annotate(count=Count('id'))
            .order_by('department__name')
        )
        data = [
            {
                'department': row['department__name'] or 'Unassigned',
                'count': int(row['count'] or 0),
            }
            for row in qs
        ]
        return Response(data)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related('sector', 'department').all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]


class AdminStatsView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        data = {
            'total_indicators': Indicator.objects.count(),
            'total_annual_plans': AnnualPlan.objects.count(),
            'total_sectors': StateMinisterSector.objects.count(),
            'total_users': User.objects.count(),
        }
        return Response(data)

