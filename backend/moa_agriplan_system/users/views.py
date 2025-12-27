from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Sum, Count
from django.utils import timezone
from .models import User
from .serializers import UserSerializer, ProfileSerializer
from indicators.models import Indicator, StateMinisterSector, Department, IndicatorGroup
from plans.models import AnnualPlan, QuarterlyBreakdown, QuarterlyPerformance, PlanStatus, PerformanceStatus


class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)

class MeView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        serializer = ProfileSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = ProfileSerializer(request.user, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request):
        serializer = ProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    """Allow an authenticated user to change their own password.

    Expects JSON body: {"old_password": "...", "new_password": "..."}
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password') or ''
        new_password = request.data.get('new_password') or ''

        if not old_password or not new_password:
            return Response({'detail': 'Both old_password and new_password are required.'}, status=400)

        if not user.check_password(old_password):
            return Response({'detail': 'Old password is incorrect.'}, status=400)

        user.set_password(new_password)
        user.save()
        return Response({'detail': 'Password changed successfully.'})


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


class IsActivityLogViewer(permissions.BasePermission):
    """Allow only superusers, Strategic Staff, and Executive to view activity logs."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if getattr(user, 'is_superuser', False):
            return True
        role = getattr(user, 'role', '').upper()
        return role in ['STRATEGIC_STAFF', 'EXECUTIVE']


class ActivityLogView(APIView):
    permission_classes = [IsAuthenticated, IsActivityLogViewer]

    def get(self, request):
        """Return a simple combined list of recent actions on breakdowns and performances.

        This uses existing status/actor fields instead of a dedicated log table.
        """
        limit = 200

        bd_events = []
        for bd in QuarterlyBreakdown.objects.select_related('plan__indicator', 'submitted_by', 'reviewed_by', 'validated_by', 'final_approved_by').all():
            indicator_name = getattr(bd.plan.indicator, 'name', '') if bd.plan and bd.plan.indicator else ''
            sector_name = getattr(getattr(bd.plan.indicator.department, 'sector', None), 'name', None) if getattr(bd.plan, 'indicator', None) and getattr(bd.plan.indicator, 'department', None) else None
            department_name = getattr(getattr(bd.plan.indicator, 'department', None), 'name', None) if getattr(bd.plan, 'indicator', None) else None

            if bd.submitted_at:
                bd_events.append({
                    'type': 'BREAKDOWN',
                    'action': 'SUBMITTED',
                    'by': getattr(bd.submitted_by, 'username', None),
                    'at': bd.submitted_at,
                    'status': bd.status,
                    'indicator': indicator_name,
                    'sector': sector_name,
                    'department': department_name,
                    'comment': '',
                })
            if bd.reviewed_at:
                bd_events.append({
                    'type': 'BREAKDOWN',
                    'action': 'REVIEWED',
                    'by': getattr(bd.reviewed_by, 'username', None),
                    'at': bd.reviewed_at,
                    'status': bd.status,
                    'indicator': indicator_name,
                    'sector': sector_name,
                    'department': department_name,
                    'comment': bd.review_comment or '',
                })
            if bd.validated_at:
                bd_events.append({
                    'type': 'BREAKDOWN',
                    'action': 'VALIDATED',
                    'by': getattr(bd.validated_by, 'username', None),
                    'at': bd.validated_at,
                    'status': bd.status,
                    'indicator': indicator_name,
                    'sector': sector_name,
                    'department': department_name,
                    'comment': '',
                })
            if bd.final_approved_at:
                bd_events.append({
                    'type': 'BREAKDOWN',
                    'action': 'FINAL_APPROVED',
                    'by': getattr(bd.final_approved_by, 'username', None),
                    'at': bd.final_approved_at,
                    'status': bd.status,
                    'indicator': indicator_name,
                    'sector': sector_name,
                    'department': department_name,
                    'comment': '',
                })

        perf_events = []
        for perf in QuarterlyPerformance.objects.select_related('plan__indicator', 'submitted_by', 'reviewed_by', 'validated_by', 'final_approved_by').all():
            indicator_name = getattr(perf.plan.indicator, 'name', '') if perf.plan and perf.plan.indicator else ''
            sector_name = getattr(getattr(perf.plan.indicator.department, 'sector', None), 'name', None) if getattr(perf.plan, 'indicator', None) and getattr(perf.plan.indicator, 'department', None) else None
            department_name = getattr(getattr(perf.plan.indicator, 'department', None), 'name', None) if getattr(perf.plan, 'indicator', None) else None

            if perf.submitted_at:
                perf_events.append({
                    'type': 'PERFORMANCE',
                    'action': 'SUBMITTED',
                    'by': getattr(perf.submitted_by, 'username', None),
                    'at': perf.submitted_at,
                    'status': perf.status,
                    'indicator': indicator_name,
                    'sector': sector_name,
                    'department': department_name,
                    'comment': '',
                })
            if perf.reviewed_at:
                perf_events.append({
                    'type': 'PERFORMANCE',
                    'action': 'REVIEWED',
                    'by': getattr(perf.reviewed_by, 'username', None),
                    'at': perf.reviewed_at,
                    'status': perf.status,
                    'indicator': indicator_name,
                    'sector': sector_name,
                    'department': department_name,
                    'comment': perf.review_comment or '',
                })
            if perf.validated_at:
                perf_events.append({
                    'type': 'PERFORMANCE',
                    'action': 'VALIDATED',
                    'by': getattr(perf.validated_by, 'username', None),
                    'at': perf.validated_at,
                    'status': perf.status,
                    'indicator': indicator_name,
                    'sector': sector_name,
                    'department': department_name,
                    'comment': '',
                })
            if perf.final_approved_at:
                perf_events.append({
                    'type': 'PERFORMANCE',
                    'action': 'FINAL_APPROVED',
                    'by': getattr(perf.final_approved_by, 'username', None),
                    'at': perf.final_approved_at,
                    'status': perf.status,
                    'indicator': indicator_name,
                    'sector': sector_name,
                    'department': department_name,
                    'comment': '',
                })

        events = bd_events + perf_events
        events.sort(key=lambda e: e['at'] or 0, reverse=True)
        events = events[:limit]

        # Normalize datetime to ISO format
        for e in events:
            if e['at'] is not None:
                e['at'] = e['at'].isoformat()

        return Response(events)


class IsMinisterView(permissions.BasePermission):
    """Allow only MINISTER_VIEW role to access."""
    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        role = getattr(user, 'role', '').upper()
        return role == 'MINISTER_VIEW'


class IsIndicatorDashboardViewer(permissions.BasePermission):
    """Allow State Minister, Advisor, Strategic Affairs Staff, Executive, and Minister View to access indicator dashboard."""
    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        role = getattr(user, 'role', '').upper()
        return role in ['STATE_MINISTER', 'ADVISOR', 'STRATEGIC_STAFF', 'EXECUTIVE', 'MINISTER_VIEW']


class MinisterDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsIndicatorDashboardViewer]

    def get(self, request):
        year = request.query_params.get('year')
        if year:
            try:
                year = int(year)
            except ValueError:
                year = None

        # If no year provided, use the most recent year with data
        if not year:
            latest_plan = AnnualPlan.objects.order_by('-year').first()
            if latest_plan:
                year = latest_plan.year
            else:
                # No data at all, return empty response
                return Response({
                    'kpis': {
                        'total_annual_target': 0,
                        'total_achieved_performance': 0,
                        'achievement_percentage': 0,
                        'indicators_on_track': 0,
                        'indicators_lagging': 0,
                    },
                    'sector_comparison': [],
                    'quarterly_trend': [
                        {'quarter': 'Q1', 'planned': 0, 'actual': 0},
                        {'quarter': 'Q2', 'planned': 0, 'actual': 0},
                        {'quarter': 'Q3', 'planned': 0, 'actual': 0},
                        {'quarter': 'Q4', 'planned': 0, 'actual': 0},
                    ],
                    'approval_status': {'approved': 0, 'pending': 0, 'rejected': 0},
                    'approval_stages': {
                        'draft': 0, 'submitted': 0, 'approved': 0,
                        'validated': 0, 'final_approved': 0, 'rejected': 0,
                    },
                    'sector_summaries': [],
                    'indicators_at_risk': [],
                    'late_or_rejected': [],
                })

        # Get all plans (Minister can see all) - filter by year
        plans_qs = AnnualPlan.objects.select_related(
            'indicator__department__sector'
        ).filter(year=year)

        # Get breakdowns and performances (only approved or higher) - filter by year
        breakdowns_qs = QuarterlyBreakdown.objects.select_related(
            'plan__indicator__department__sector'
        ).filter(
            plan__year=year,
            status__in=[PlanStatus.APPROVED, PlanStatus.VALIDATED, PlanStatus.FINAL_APPROVED]
        )

        perfs_qs = QuarterlyPerformance.objects.select_related(
            'plan__indicator__department__sector'
        ).filter(
            plan__year=year,
            status__in=[PerformanceStatus.APPROVED, PerformanceStatus.VALIDATED, PerformanceStatus.FINAL_APPROVED]
        )

        # 1. KPI Cards
        total_annual_target = sum(float(p.target) for p in plans_qs)
        
        # Total achieved performance (sum of all quarterly performances)
        total_achieved = sum(float(p.value) for p in perfs_qs)
        
        achievement_percentage = (total_achieved / total_annual_target * 100) if total_annual_target > 0 else 0

        # Indicators on track vs lagging
        indicator_performance = {}
        for perf in perfs_qs:
            plan_id = perf.plan_id
            if plan_id not in indicator_performance:
                try:
                    plan = plans_qs.get(id=plan_id)
                    indicator_performance[plan_id] = {
                        'target': float(plan.target),
                        'achieved': 0,
                        'indicator_name': plan.indicator.name,
                    }
                except AnnualPlan.DoesNotExist:
                    continue
            indicator_performance[plan_id]['achieved'] += float(perf.value)

        on_track = 0
        lagging = 0
        for perf_data in indicator_performance.values():
            progress_pct = (perf_data['achieved'] / perf_data['target'] * 100) if perf_data['target'] > 0 else 0
            if progress_pct >= 75:
                on_track += 1
            else:
                lagging += 1

        # 2. Sector-wise performance comparison
        sector_data = {}
        for plan in plans_qs:
            sector_id = plan.indicator.department.sector.id
            sector_name = plan.indicator.department.sector.name
            if sector_id not in sector_data:
                sector_data[sector_id] = {
                    'sector_id': sector_id,
                    'sector_name': sector_name,
                    'target': 0,
                    'achieved': 0,
                }
            sector_data[sector_id]['target'] += float(plan.target)

        for perf in perfs_qs:
            try:
                plan = plans_qs.get(id=perf.plan_id)
                sector_id = plan.indicator.department.sector.id
                if sector_id in sector_data:
                    sector_data[sector_id]['achieved'] += float(perf.value)
            except AnnualPlan.DoesNotExist:
                continue

        sector_comparison = list(sector_data.values())

        # 3. Quarterly trend data
        quarterly_planned = {'Q1': 0, 'Q2': 0, 'Q3': 0, 'Q4': 0}
        quarterly_actual = {'Q1': 0, 'Q2': 0, 'Q3': 0, 'Q4': 0}

        for bd in breakdowns_qs:
            quarterly_planned['Q1'] += float(bd.q1 or 0)
            quarterly_planned['Q2'] += float(bd.q2 or 0)
            quarterly_planned['Q3'] += float(bd.q3 or 0)
            quarterly_planned['Q4'] += float(bd.q4 or 0)

        for perf in perfs_qs:
            q_key = f'Q{perf.quarter}'
            if q_key in quarterly_actual:
                quarterly_actual[q_key] += float(perf.value)

        quarterly_trend = [
            {'quarter': 'Q1', 'planned': quarterly_planned['Q1'], 'actual': quarterly_actual['Q1']},
            {'quarter': 'Q2', 'planned': quarterly_planned['Q2'], 'actual': quarterly_actual['Q2']},
            {'quarter': 'Q3', 'planned': quarterly_planned['Q3'], 'actual': quarterly_actual['Q3']},
            {'quarter': 'Q4', 'planned': quarterly_planned['Q4'], 'actual': quarterly_actual['Q4']},
        ]

        # 4. Approval status (for all breakdowns and performances, not just approved) - filter by year
        all_breakdowns = QuarterlyBreakdown.objects.select_related(
            'plan__indicator__department__sector'
        ).filter(plan__year=year)
        all_perfs = QuarterlyPerformance.objects.select_related(
            'plan__indicator__department__sector'
        ).filter(plan__year=year)

        approved_count = 0
        pending_count = 0
        rejected_count = 0

        for bd in all_breakdowns:
            status = bd.status.upper()
            if status == 'FINAL_APPROVED':
                approved_count += 1
            elif status == 'REJECTED':
                rejected_count += 1
            else:
                pending_count += 1

        for perf in all_perfs:
            status = perf.status.upper()
            if status == 'FINAL_APPROVED':
                approved_count += 1
            elif status == 'REJECTED':
                rejected_count += 1
            else:
                pending_count += 1

        approval_status = {
            'approved': approved_count,
            'pending': pending_count,
            'rejected': rejected_count,
        }

        # Approval stage breakdown
        stage_counts = {
            'draft': 0,
            'submitted': 0,
            'approved': 0,
            'validated': 0,
            'final_approved': 0,
            'rejected': 0,
        }

        for bd in all_breakdowns:
            status_lower = bd.status.lower()
            if status_lower in stage_counts:
                stage_counts[status_lower] += 1

        for perf in all_perfs:
            status_lower = perf.status.lower()
            if status_lower in stage_counts:
                stage_counts[status_lower] += 1

        # 5. Sector summary cards
        sector_summaries = []
        for sector_id, data in sector_data.items():
            progress_rate = (data['achieved'] / data['target'] * 100) if data['target'] > 0 else 0
            sector_summaries.append({
                'sector_id': sector_id,
                'sector_name': data['sector_name'],
                'annual_target': data['target'],
                'performance_achieved': data['achieved'],
                'progress_rate': progress_rate,
            })
        sector_summaries.sort(key=lambda x: x['sector_name'])

        # 6. Indicators at Risk
        indicators_at_risk = []
        for plan_id, perf_data in indicator_performance.items():
            try:
                plan = plans_qs.get(id=plan_id)
                progress_pct = (perf_data['achieved'] / perf_data['target'] * 100) if perf_data['target'] > 0 else 0
                gap = perf_data['target'] - perf_data['achieved']
                
                # Determine risk level
                if progress_pct < 50:
                    risk_level = 'HIGH'
                elif progress_pct < 75:
                    risk_level = 'MEDIUM'
                else:
                    risk_level = 'LOW'

                # Only include if lagging
                if progress_pct < 75:
                    indicators_at_risk.append({
                        'indicator_name': perf_data['indicator_name'],
                        'sector_name': plan.indicator.department.sector.name,
                        'department_name': plan.indicator.department.name,
                        'target': perf_data['target'],
                        'achieved': perf_data['achieved'],
                        'gap': gap,
                        'progress_pct': progress_pct,
                        'risk_level': risk_level,
                    })
            except AnnualPlan.DoesNotExist:
                continue

        indicators_at_risk.sort(key=lambda x: x['progress_pct'])

        # 7. Late or rejected submissions
        late_or_rejected = []
        now = timezone.now()
        
        for bd in all_breakdowns:
            if bd.status == 'REJECTED':
                try:
                    plan = plans_qs.get(id=bd.plan_id)
                    late_or_rejected.append({
                        'type': 'BREAKDOWN',
                        'indicator_name': plan.indicator.name,
                        'sector_name': plan.indicator.department.sector.name,
                        'department_name': plan.indicator.department.name,
                        'status': 'REJECTED',
                        'submitted_at': bd.submitted_at.isoformat() if bd.submitted_at else None,
                        'reviewed_at': bd.reviewed_at.isoformat() if bd.reviewed_at else None,
                        'comment': bd.review_comment or '',
                    })
                except AnnualPlan.DoesNotExist:
                    continue
            elif bd.status == 'SUBMITTED' and bd.submitted_at:
                days_since_submission = (now - bd.submitted_at).days
                if days_since_submission > 30:
                    try:
                        plan = plans_qs.get(id=bd.plan_id)
                        late_or_rejected.append({
                            'type': 'BREAKDOWN',
                            'indicator_name': plan.indicator.name,
                            'sector_name': plan.indicator.department.sector.name,
                            'department_name': plan.indicator.department.name,
                            'status': 'LATE',
                            'submitted_at': bd.submitted_at.isoformat(),
                            'days_late': days_since_submission - 30,
                            'comment': '',
                        })
                    except AnnualPlan.DoesNotExist:
                        continue

        for perf in all_perfs:
            if perf.status == 'REJECTED':
                try:
                    plan = plans_qs.get(id=perf.plan_id)
                    late_or_rejected.append({
                        'type': 'PERFORMANCE',
                        'indicator_name': plan.indicator.name,
                        'sector_name': plan.indicator.department.sector.name,
                        'department_name': plan.indicator.department.name,
                        'quarter': perf.quarter,
                        'status': 'REJECTED',
                        'submitted_at': perf.submitted_at.isoformat() if perf.submitted_at else None,
                        'reviewed_at': perf.reviewed_at.isoformat() if perf.reviewed_at else None,
                        'comment': perf.review_comment or '',
                    })
                except AnnualPlan.DoesNotExist:
                    continue
            elif perf.status == 'SUBMITTED' and perf.submitted_at:
                days_since_submission = (now - perf.submitted_at).days
                if days_since_submission > 30:
                    try:
                        plan = plans_qs.get(id=perf.plan_id)
                        late_or_rejected.append({
                            'type': 'PERFORMANCE',
                            'indicator_name': plan.indicator.name,
                            'sector_name': plan.indicator.department.sector.name,
                            'department_name': plan.indicator.department.name,
                            'quarter': perf.quarter,
                            'status': 'LATE',
                            'submitted_at': perf.submitted_at.isoformat(),
                            'days_late': days_since_submission - 30,
                            'comment': '',
                        })
                    except AnnualPlan.DoesNotExist:
                        continue

        return Response({
            'kpis': {
                'total_annual_target': total_annual_target,
                'total_achieved_performance': total_achieved,
                'achievement_percentage': achievement_percentage,
                'indicators_on_track': on_track,
                'indicators_lagging': lagging,
            },
            'sector_comparison': sector_comparison,
            'quarterly_trend': quarterly_trend,
            'approval_status': approval_status,
            'approval_stages': stage_counts,
            'sector_summaries': sector_summaries,
            'indicators_at_risk': indicators_at_risk[:20],
            'late_or_rejected': late_or_rejected[:50],
        })


class IndicatorPerformanceView(APIView):
    permission_classes = [IsAuthenticated, IsIndicatorDashboardViewer]

    def get(self, request):
        """Returns hierarchical indicator performance data organized by sector, indicator groups, and indicators."""
        year = request.query_params.get('year')
        if year:
            try:
                year = int(year)
            except ValueError:
                year = None

        # If no year provided, use the most recent year with data
        if not year:
            latest_plan = AnnualPlan.objects.order_by('-year').first()
            if latest_plan:
                year = latest_plan.year
            else:
                return Response({'sectors': []})

        # Get all plans with related data
        plans_qs = AnnualPlan.objects.select_related(
            'indicator__department__sector'
        ).prefetch_related(
            'indicator__groups'
        ).filter(year=year)

        # Get performances (only approved or higher)
        perfs_qs = QuarterlyPerformance.objects.select_related(
            'plan__indicator__department__sector'
        ).filter(
            plan__year=year,
            status__in=[PerformanceStatus.APPROVED, PerformanceStatus.VALIDATED, PerformanceStatus.FINAL_APPROVED]
        )

        # Build sector structure
        sectors_dict = {}
        
        for plan in plans_qs:
            sector = plan.indicator.department.sector
            sector_id = sector.id
            
            if sector_id not in sectors_dict:
                sectors_dict[sector_id] = {
                    'id': sector_id,
                    'name': sector.name,
                    'indicators': {},
                    'indicator_groups': {},
                }
            
            indicator = plan.indicator
            indicator_id = indicator.id
            plan_id = plan.id
            
            # Calculate indicator performance
            indicator_perfs = perfs_qs.filter(plan_id=plan_id)
            total_achieved = sum(float(p.value) for p in indicator_perfs)
            target = float(plan.target)
            
            if target > 0:
                performance_pct = (total_achieved / target) * 100
            else:
                performance_pct = None
            
            # Get indicator groups
            groups = indicator.groups.all()
            group_id = groups.first().id if groups.exists() else None
            group_name = groups.first().name if groups.exists() else None
            
            # Store indicator data
            indicator_data = {
                'id': indicator_id,
                'plan_id': plan_id,
                'name': indicator.name,
                'unit': indicator.unit or '',
                'description': indicator.description or '',
                'department_name': plan.indicator.department.name,
                'target': target,
                'achieved': total_achieved,
                'performance_percentage': performance_pct,
                'group_id': group_id,
                'group_name': group_name,
            }
            
            sectors_dict[sector_id]['indicators'][indicator_id] = indicator_data
            
            # Organize by indicator groups
            if group_id:
                if group_id not in sectors_dict[sector_id]['indicator_groups']:
                    sectors_dict[sector_id]['indicator_groups'][group_id] = {
                        'id': group_id,
                        'name': group_name,
                        'indicators': [],
                    }
                sectors_dict[sector_id]['indicator_groups'][group_id]['indicators'].append(indicator_data)
        
        # Calculate sector and group performance percentages
        sectors_list = []
        for sector_id, sector_data in sectors_dict.items():
            # Calculate sector overall performance (average of all indicators)
            indicator_percentages = [
                ind['performance_percentage']
                for ind in sector_data['indicators'].values()
                if ind['performance_percentage'] is not None
            ]
            
            if indicator_percentages:
                sector_performance = sum(indicator_percentages) / len(indicator_percentages)
            else:
                sector_performance = None
            
            # Calculate group performances
            groups_list = []
            for group_id, group_data in sector_data['indicator_groups'].items():
                group_percentages = [
                    ind['performance_percentage']
                    for ind in group_data['indicators']
                    if ind['performance_percentage'] is not None
                ]
                
                if group_percentages:
                    group_performance = sum(group_percentages) / len(group_percentages)
                else:
                    group_performance = None
                
                groups_list.append({
                    'id': group_data['id'],
                    'name': group_data['name'],
                    'performance_percentage': group_performance,
                    'indicators': group_data['indicators'],
                })
            
            # Add indicators without groups
            ungrouped_indicators = [
                ind for ind in sector_data['indicators'].values()
                if ind['group_id'] is None
            ]
            
            sectors_list.append({
                'id': sector_data['id'],
                'name': sector_data['name'],
                'performance_percentage': sector_performance,
                'indicator_groups': groups_list,
                'ungrouped_indicators': ungrouped_indicators,
            })
        
        return Response({
            'year': year,
            'sectors': sectors_list,
        })


class IndicatorDetailView(APIView):
    permission_classes = [IsAuthenticated, IsIndicatorDashboardViewer]

    def get(self, request):
        """Returns yearly and quarterly performance data for a specific indicator."""
        indicator_id = request.query_params.get('indicator_id')
        if not indicator_id:
            return Response({'error': 'indicator_id is required'}, status=400)
        
        try:
            indicator_id = int(indicator_id)
        except ValueError:
            return Response({'error': 'invalid indicator_id'}, status=400)

        # Get current year for quarterly view
        current_year = request.query_params.get('year')
        if current_year:
            try:
                current_year = int(current_year)
            except ValueError:
                current_year = None

        if not current_year:
            latest_plan = AnnualPlan.objects.filter(indicator_id=indicator_id).order_by('-year').first()
            if latest_plan:
                current_year = latest_plan.year
            else:
                return Response({
                    'indicator': None,
                    'yearly_data': [],
                    'quarterly_data': [],
                })

        # Get indicator info
        try:
            indicator = Indicator.objects.select_related('department', 'department__sector').get(id=indicator_id)
        except Indicator.DoesNotExist:
            return Response({'error': 'indicator not found'}, status=404)

        # Get yearly data (5 consecutive years)
        years_list = []
        if current_year:
            years_list = list(range(current_year - 4, current_year + 1))
        else:
            years_list = []

        yearly_data = []
        for y in years_list:
            try:
                plan = AnnualPlan.objects.get(indicator_id=indicator_id, year=y)
                target = float(plan.target)
                
                # Get all performances for this plan
                perfs = QuarterlyPerformance.objects.filter(
                    plan_id=plan.id,
                    status__in=[PerformanceStatus.APPROVED, PerformanceStatus.VALIDATED, PerformanceStatus.FINAL_APPROVED]
                )
                achieved = sum(float(p.value) for p in perfs)
                
                yearly_data.append({
                    'year': y,
                    'target': target,
                    'achieved': achieved,
                })
            except AnnualPlan.DoesNotExist:
                yearly_data.append({
                    'year': y,
                    'target': 0,
                    'achieved': 0,
                })

        # Get quarterly data for current year
        quarterly_data = []
        try:
            plan = AnnualPlan.objects.get(indicator_id=indicator_id, year=current_year)
            
            # Get breakdown
            try:
                breakdown = QuarterlyBreakdown.objects.get(plan_id=plan.id)
            except QuarterlyBreakdown.DoesNotExist:
                breakdown = None
            
            # Get performances
            perfs = QuarterlyPerformance.objects.filter(
                plan_id=plan.id,
                status__in=[PerformanceStatus.APPROVED, PerformanceStatus.VALIDATED, PerformanceStatus.FINAL_APPROVED]
            )
            
            for q in [1, 2, 3, 4]:
                if breakdown:
                    if q == 1:
                        q_target = float(breakdown.q1 or 0)
                    elif q == 2:
                        q_target = float(breakdown.q2 or 0)
                    elif q == 3:
                        q_target = float(breakdown.q3 or 0)
                    else:
                        q_target = float(breakdown.q4 or 0)
                else:
                    q_target = 0
                
                q_perf = perfs.filter(quarter=q).first()
                q_achieved = float(q_perf.value) if q_perf else 0
                
                # Calculate performance percentage
                q_percentage = None
                variance_description = None
                if q_target > 0 and q_perf:
                    q_percentage = (q_achieved / q_target) * 100
                    # Include variance_description if performance is < 84% or > 110%
                    if q_percentage < 84 or q_percentage > 110:
                        variance_description = q_perf.variance_description or None
                
                quarterly_data.append({
                    'quarter': f'Q{q}',
                    'target': q_target,
                    'achieved': q_achieved,
                    'percentage': q_percentage,
                    'variance_description': variance_description,
                })
        except AnnualPlan.DoesNotExist:
            quarterly_data = [
                {'quarter': 'Q1', 'target': 0, 'achieved': 0},
                {'quarter': 'Q2', 'target': 0, 'achieved': 0},
                {'quarter': 'Q3', 'target': 0, 'achieved': 0},
                {'quarter': 'Q4', 'target': 0, 'achieved': 0},
            ]

        return Response({
            'indicator': {
                'id': indicator.id,
                'name': indicator.name,
                'unit': indicator.unit or '',
                'description': indicator.description or '',
                'department_name': indicator.department.name,
            },
            'yearly_data': yearly_data,
            'quarterly_data': quarterly_data,
        })
