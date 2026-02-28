from django.shortcuts import render
from rest_framework import viewsets, permissions
from .models import StateMinisterSector, Department, Indicator, IndicatorGroup
from .serializers import StateMinisterSectorSerializer, DepartmentSerializer, IndicatorSerializer, IndicatorGroupSerializer
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Avg, Count, Q
from plans.models import AnnualPlan, QuarterlyBreakdown, QuarterlyPerformance

class SuperuserWritePermission(permissions.BasePermission):
    def has_permission(self, request, view):
        # Read for authenticated users; write only for superusers
        if request.method in permissions.SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)

class IndicatorGroupWritePermission(permissions.BasePermission):
    def has_permission(self, request, view):
        # Read for authenticated users; write for superusers and state ministers within their sector
        if request.method in permissions.SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Superusers can always write
        if getattr(request.user, 'is_superuser', False):
            return True
            
        # State ministers can write within their sector
        role = getattr(request.user, 'role', '').upper()
        if role == 'STATE_MINISTER':
            user_sector_id = getattr(getattr(request.user, 'sector', None), 'id', None) or getattr(request.user, 'sector', None)
            return bool(user_sector_id)
            
        return False

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
            sector_id = getattr(getattr(dept, 'sector', None), 'id', None) or getattr(user, 'sector', None)
            if sector_id:
                qs = qs.filter(id=sector_id)
        return qs

class IndicatorGroupViewSet(viewsets.ModelViewSet):
    queryset = IndicatorGroup.objects.select_related('department', 'department__sector', 'sector').all().order_by('name')
    serializer_class = IndicatorGroupSerializer
    permission_classes = [IndicatorGroupWritePermission]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        department_id = self.request.query_params.get('department')
        sector_id = self.request.query_params.get('sector')
        
        if department_id:
            qs = qs.filter(department_id=department_id)
        elif sector_id:
            qs = qs.filter(sector_id=sector_id)
            
        if getattr(user, 'is_superuser', False):
            return qs
        role = getattr(user, 'role', '').upper()
        if role == 'STATE_MINISTER':
            s_id = getattr(getattr(user, 'sector', None), 'id', None) or getattr(user, 'sector', None)
            if s_id:
                qs = qs.filter(
                    Q(department__sector_id=s_id) | Q(sector_id=s_id)
                )
        elif role == 'ADVISOR':
            d_id = getattr(getattr(user, 'department', None), 'id', None) or getattr(user, 'department', None)
            if d_id:
                qs = qs.filter(department_id=d_id)
            else:
                s_id = getattr(getattr(user, 'sector', None), 'id', None) or getattr(user, 'sector', None)
                if s_id:
                    qs = qs.filter(
                        Q(department__sector_id=s_id) | Q(sector_id=s_id)
                    )
        return qs

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.indicators.exists():
            return Response({'detail': 'Cannot delete an indicator group that has associated indicators. Remove or reassign them first.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

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
        group_id = self.request.query_params.get('group')
        if group_id:
            if group_id.lower() == 'null':
                qs = qs.filter(groups__isnull=True)
            else:
                qs = qs.filter(groups__id=group_id)
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

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def state_minister_dashboard(request):
    """
    Dashboard for State Minister showing hierarchical indicator group performance
    """
    user = request.user
    year = request.query_params.get('year')
    
    # Get user's sector
    sector_id = None
    if getattr(user, 'is_superuser', False) or getattr(user, 'role', '').upper() == 'SUPERADMIN':
        # For superuser or SUPERADMIN, you might want to allow sector selection or show all
        sector_id = request.query_params.get('sector_id')
        if not sector_id:
            # If no sector specified, get the first available sector
            first_sector = StateMinisterSector.objects.first()
            sector_id = first_sector.id if first_sector else None
    else:
        role = getattr(user, 'role', '').upper()
        if role == 'STATE_MINISTER':
            sector_id = getattr(getattr(user, 'sector', None), 'id', None) or getattr(user, 'sector', None)
        elif role == 'ADVISOR':
            dept = getattr(user, 'department', None)
            sector_id = getattr(getattr(dept, 'sector', None), 'id', None) or getattr(user, 'sector', None)
    
    if not sector_id:
        return Response({'detail': 'No sector found for user'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Get root indicator groups for this sector (groups with no parent)
    root_groups = IndicatorGroup.objects.filter(
        Q(department__sector_id=sector_id) | Q(sector_id=sector_id),
        parent__isnull=True
    ).select_related('department', 'sector').prefetch_related(
        'children__indicators',
        'indicators'
    ).distinct()
    
    # Get all ungrouped indicators for this sector
    ungrouped_indicators = Indicator.objects.filter(
        Q(department__sector_id=sector_id),
        groups__isnull=True
    ).select_related('department')
    
    # Helper function to calculate group performance using model methods
    def calculate_group_performance(group, year):
        # Use the model's recursive aggregation methods
        annual_target = group.get_annual_target_aggregate(year)
        quarterly_breakdown = group.get_quarterly_breakdown_aggregate(year)
        
        # Calculate total performance across all quarters
        total_performance = 0
        for quarter in range(1, 5):
            total_performance += group.get_performance_aggregate(year, quarter)
        
        performance_percentage = (total_performance / annual_target * 100) if annual_target > 0 else None
        
        return {
            'annual_target_aggregate': annual_target,
            'performance_aggregate': total_performance,
            'performance_percentage': performance_percentage,
            'quarterly_breakdown_aggregate': quarterly_breakdown
        }
    
    # Helper function to build group tree with performance
    def build_group_tree(groups, year):
        result = []
        for group in groups:
            performance_data = calculate_group_performance(group, year)
            
            # Get indicators with their performance
            indicators_data = []
            for indicator in group.indicators.all():
                annual_plan = AnnualPlan.objects.filter(indicator=indicator, year=year).first()
                if annual_plan:
                    performance = QuarterlyPerformance.objects.filter(plan=annual_plan).aggregate(
                        total=Sum('value')
                    )['total'] or 0
                    
                    indicators_data.append({
                        'id': indicator.id,
                        'name': indicator.name,
                        'unit': indicator.unit,
                        'description': indicator.description,
                        'target': annual_plan.target,
                        'achieved': performance,
                        'performance_percentage': (performance / annual_plan.target * 100) if annual_plan.target > 0 else None
                    })
            
            group_data = {
                'id': group.id,
                'name': group.name,
                'level': group.level,
                'hierarchy_path': group.hierarchy_path,
                'is_parent': group.is_parent,
                'children': build_group_tree(group.children.all(), year),
                'indicators': indicators_data,
                **performance_data
            }
            result.append(group_data)
        return result
    
    # Build the data structure
    root_groups_data = build_group_tree(root_groups, year)
    
    # Get ungrouped indicators with performance
    ungrouped_data = []
    for indicator in ungrouped_indicators:
        annual_plan = AnnualPlan.objects.filter(indicator=indicator, year=year).first()
        if annual_plan:
            performance = QuarterlyPerformance.objects.filter(plan=annual_plan).aggregate(
                total=Sum('value')
            )['total'] or 0
            
            ungrouped_data.append({
                'id': indicator.id,
                'name': indicator.name,
                'unit': indicator.unit,
                'description': indicator.description,
                'target': annual_plan.target,
                'achieved': performance,
                'performance_percentage': (performance / annual_plan.target * 100) if annual_plan.target > 0 else None
            })
    
    # Calculate KPIs
    all_indicators = []
    def collect_all_indicators(groups):
        for group in groups:
            all_indicators.extend(group['indicators'])
            collect_all_indicators(group['children'])
    
    collect_all_indicators(root_groups_data)
    all_indicators.extend(ungrouped_data)
    
    total_indicators = len(all_indicators)
    total_target = sum(ind['target'] for ind in all_indicators)
    total_achieved = sum(ind['achieved'] for ind in all_indicators)
    overall_performance = (total_achieved / total_target * 100) if total_target > 0 else None
    
    # Count groups on track vs lagging
    def count_group_performance(groups):
        on_track = 0
        lagging = 0
        for group in groups:
            if group['performance_percentage'] is not None:
                if group['performance_percentage'] >= 85:
                    on_track += 1
                else:
                    lagging += 1
            child_on_track, child_lagging = count_group_performance(group['children'])
            on_track += child_on_track
            lagging += child_lagging
        return on_track, lagging
    
    groups_on_track, groups_lagging = count_group_performance(root_groups_data)
    
    # Get department performance and quarterly trends
    department_performance = []
    quarterly_trends = []
    
    # Get all departments in the sector
    departments = Department.objects.filter(sector_id=sector_id)
    
    for dept in departments:
        # Get all indicators for this department
        dept_indicators = Indicator.objects.filter(department=dept)
        
        # Calculate department performance metrics
        total_target = 0
        total_achieved = 0
        indicator_count = 0
        
        for indicator in dept_indicators:
            annual_plan = AnnualPlan.objects.filter(indicator=indicator, year=year).first()
            if annual_plan:
                total_target += annual_plan.target
                # Get performance for all quarters
                quarterly_perf = QuarterlyPerformance.objects.filter(plan=annual_plan).aggregate(
                    total=Sum('value')
                )['total'] or 0
                total_achieved += quarterly_perf
                indicator_count += 1
        
        # Calculate average performance percentage
        avg_performance = (total_achieved / total_target * 100) if total_target > 0 else None
        
        # Add to department performance list
        if indicator_count > 0:
            department_performance.append({
                'department_id': dept.id,
                'department_name': dept.name,
                'average_performance': avg_performance,
                'total_indicators': indicator_count,
                'total_target': total_target,
                'total_achieved': total_achieved,
            })
            
            # Generate simplified quarterly trend data for this department
            for quarter in range(1, 5):
                # Simplified quarterly calculation
                quarter_target = float(total_target / 4)  # Convert to float and distribute evenly across quarters
                quarter_achieved = float(total_achieved / 4)  # Convert to float and distribute evenly
                quarter_performance = (quarter_achieved / quarter_target * 100) if quarter_target > 0 else 0
                
                quarterly_trends.append({
                    'quarter': f'Q{quarter}',
                    'department_name': dept.name,
                    'target': quarter_target,
                    'achieved': quarter_achieved,
                    'performance_percentage': quarter_performance,
                })
    
    # Get sector info
    sector = StateMinisterSector.objects.filter(id=sector_id).first()
    
    return Response({
        'sector': {
            'id': sector.id if sector else 0,
            'name': sector.name if sector else 'Unknown'
        },
        'root_groups': root_groups_data,
        'ungrouped_indicators': ungrouped_data,
        'kpis': {
            'total_indicators': total_indicators,
            'total_target': total_target,
            'total_achieved': total_achieved,
            'overall_performance': overall_performance,
            'groups_on_track': groups_on_track,
            'groups_lagging': groups_lagging,
        },
        'department_performance': department_performance,
        'quarterly_trends': quarterly_trends,
    })
