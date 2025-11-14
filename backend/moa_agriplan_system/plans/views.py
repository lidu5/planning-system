from django.shortcuts import render
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from decimal import Decimal
from .models import (
    AnnualPlan,
    QuarterlyBreakdown,
    QuarterlyPerformance,
    FileAttachment,
    SubmissionWindow,
    PlanStatus,
    PerformanceStatus,
    within_annual_breakdown_window,
    within_quarter_submission_window,
)
from .serializers import (
    AnnualPlanSerializer,
    QuarterlyBreakdownSerializer,
    QuarterlyPerformanceSerializer,
    FileAttachmentSerializer,
    SubmissionWindowSerializer,
)

class SuperuserWritePermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)

class AnnualPlanViewSet(viewsets.ModelViewSet):
    queryset = AnnualPlan.objects.select_related('indicator', 'indicator__department', 'indicator__department__sector').all()
    serializer_class = AnnualPlanSerializer
    permission_classes = [SuperuserWritePermission]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        # Filter by year if provided
        year = self.request.query_params.get('year')
        if year:
            try:
                qs = qs.filter(year=int(year))
            except ValueError:
                pass
        # Superuser and Strategic Staff see all
        if getattr(user, 'is_superuser', False):
            return qs
        role = getattr(user, 'role', '').upper()
        if role == 'STRATEGIC_STAFF':
            return qs
        if role == 'EXECUTIVE':
            return qs
        if role == 'MINISTER_VIEW':
            # Read-only: show approved or higher plans (context)
            return qs
        if role == 'STATE_MINISTER':
            sector_id = getattr(getattr(user, 'sector', None), 'id', None) or getattr(user, 'sector', None)
            if sector_id:
                qs = qs.filter(indicator__department__sector__id=sector_id)
        elif role == 'ADVISOR':
            dept_id = getattr(getattr(user, 'department', None), 'id', None) or getattr(user, 'department', None)
            if dept_id:
                qs = qs.filter(indicator__department__id=dept_id)
        return qs


class QuarterlyBreakdownViewSet(viewsets.ModelViewSet):
    queryset = QuarterlyBreakdown.objects.select_related('plan', 'plan__indicator').all()
    serializer_class = QuarterlyBreakdownSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        # Superusers and Strategic Staff see all
        if getattr(user, 'is_superuser', False):
            return qs
        role = getattr(user, 'role', '').upper()
        if role == 'STRATEGIC_STAFF':
            return qs
        if role == 'EXECUTIVE':
            return qs
        if role == 'MINISTER_VIEW':
            # Read-only: show approved or higher breakdowns
            return qs.filter(status__in=[PlanStatus.APPROVED, PlanStatus.VALIDATED, PlanStatus.FINAL_APPROVED])
        if role == 'STATE_MINISTER':
            # Limit to user's sector/department
            sector_id = getattr(getattr(user, 'sector', None), 'id', None) or getattr(user, 'sector', None)
            dept_id = getattr(getattr(user, 'department', None), 'id', None) or getattr(user, 'department', None)
            if dept_id:
                qs = qs.filter(plan__indicator__department__id=dept_id)
            elif sector_id:
                qs = qs.filter(plan__indicator__department__sector__id=sector_id)
        elif role == 'ADVISOR':
            # Advisors typically see their department
            dept_id = getattr(getattr(user, 'department', None), 'id', None) or getattr(user, 'department', None)
            if dept_id:
                qs = qs.filter(plan__indicator__department__id=dept_id)
        return qs

    def _allow_plan_edit(self, request):
        role = getattr(request.user, 'role', '')
        return role in ['ADVISOR', 'STATE_MINISTER']

    def create(self, request, *args, **kwargs):
        if not self._allow_plan_edit(request):
            return Response({'detail': 'Only Advisor or State Minister can create quarterly breakdowns.'}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not self._allow_plan_edit(request):
            return Response({'detail': 'Only Advisor or State Minister can update quarterly breakdowns.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        obj = self.get_object()
        now = timezone.now()
        # Only Advisors can submit breakdowns
        if getattr(request.user, 'role', '') != 'ADVISOR':
            return Response({'detail': 'Only Advisor can submit quarterly breakdowns.'}, status=status.HTTP_403_FORBIDDEN)
        if not within_annual_breakdown_window(now):
            return Response({'detail': 'Submission window closed (15 days from Jan 1).'}, status=status.HTTP_400_BAD_REQUEST)
        if obj.status not in [PlanStatus.DRAFT, PlanStatus.REJECTED]:
            return Response({'detail': 'Only draft or rejected breakdowns can be submitted.'}, status=status.HTTP_400_BAD_REQUEST)
        # Enforce quarterly totals equal annual target upon submission (2 decimal places)
        total = (obj.q1 or Decimal('0')) + (obj.q2 or Decimal('0')) + (obj.q3 or Decimal('0')) + (obj.q4 or Decimal('0'))
        total = total.quantize(Decimal('0.01'))
        target = (obj.plan.target or Decimal('0')).quantize(Decimal('0.01'))
        if total != target:
            return Response({'detail': 'Quarterly totals must equal the annual target before submission.'}, status=status.HTTP_400_BAD_REQUEST)
        obj.status = PlanStatus.SUBMITTED
        obj.submitted_by = request.user
        obj.submitted_at = now
        obj.save()
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        obj = self.get_object()
        if request.user.role != 'STATE_MINISTER':
            return Response({'detail': 'Only State Minister can approve.'}, status=status.HTTP_403_FORBIDDEN)
        if obj.status != PlanStatus.SUBMITTED:
            return Response({'detail': 'Only submitted breakdowns can be approved.'}, status=status.HTTP_400_BAD_REQUEST)
        obj.status = PlanStatus.APPROVED
        obj.reviewed_by = request.user
        obj.reviewed_at = timezone.now()
        obj.review_comment = request.data.get('comment', '')
        obj.save()
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        obj = self.get_object()
        if request.user.role != 'STRATEGIC_STAFF':
            return Response({'detail': 'Only Strategic Affairs Staff can validate.'}, status=status.HTTP_403_FORBIDDEN)
        if obj.status != PlanStatus.APPROVED:
            return Response({'detail': 'Only approved breakdowns can be validated.'}, status=status.HTTP_400_BAD_REQUEST)
        obj.status = PlanStatus.VALIDATED
        obj.validated_by = request.user
        obj.validated_at = timezone.now()
        obj.save()
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def final_approve(self, request, pk=None):
        obj = self.get_object()
        if request.user.role != 'EXECUTIVE':
            return Response({'detail': 'Only Executive Officer can final approve.'}, status=status.HTTP_403_FORBIDDEN)
        if obj.status != PlanStatus.VALIDATED:
            return Response({'detail': 'Only validated breakdowns can be final approved.'}, status=status.HTTP_400_BAD_REQUEST)
        obj.status = PlanStatus.FINAL_APPROVED
        obj.final_approved_by = request.user
        obj.final_approved_at = timezone.now()
        obj.save()
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        obj = self.get_object()
        # Only reviewer roles can reject
        if request.user.role not in ['STATE_MINISTER', 'STRATEGIC_STAFF', 'EXECUTIVE']:
            return Response({'detail': 'Only reviewer roles can reject.'}, status=status.HTTP_403_FORBIDDEN)
        # Strategic Staff must provide a rejection note
        comment = (request.data.get('comment', '') or '').strip()
        if request.user.role == 'STRATEGIC_STAFF' and not comment:
            return Response({'detail': 'Rejection note is required for Strategic Affairs Staff.'}, status=status.HTTP_400_BAD_REQUEST)
        if obj.status not in [PlanStatus.SUBMITTED, PlanStatus.APPROVED, PlanStatus.VALIDATED]:
            return Response({'detail': 'Only submitted or in-approval breakdowns can be rejected.'}, status=status.HTTP_400_BAD_REQUEST)
        obj.status = PlanStatus.REJECTED
        obj.review_comment = comment
        obj.reviewed_by = request.user
        obj.reviewed_at = timezone.now()
        obj.save()
        return Response(self.get_serializer(obj).data)


class QuarterlyPerformanceViewSet(viewsets.ModelViewSet):
    queryset = QuarterlyPerformance.objects.select_related('plan', 'plan__indicator').all()
    serializer_class = QuarterlyPerformanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if getattr(user, 'is_superuser', False):
            return qs
        role = getattr(user, 'role', '').upper()
        if role == 'STRATEGIC_STAFF':
            return qs
        if role == 'EXECUTIVE':
            return qs
        if role == 'MINISTER_VIEW':
            # Read-only: show approved or higher performances
            return qs.filter(status__in=[PerformanceStatus.APPROVED, PerformanceStatus.VALIDATED, PerformanceStatus.FINAL_APPROVED])
        if role == 'STATE_MINISTER':
            sector_id = getattr(getattr(user, 'sector', None), 'id', None) or getattr(user, 'sector', None)
            dept_id = getattr(getattr(user, 'department', None), 'id', None) or getattr(user, 'department', None)
            if dept_id:
                qs = qs.filter(plan__indicator__department__id=dept_id)
            elif sector_id:
                qs = qs.filter(plan__indicator__department__sector__id=sector_id)
        elif role == 'ADVISOR':
            dept_id = getattr(getattr(user, 'department', None), 'id', None) or getattr(user, 'department', None)
            if dept_id:
                qs = qs.filter(plan__indicator__department__id=dept_id)
        return qs
    def _advisor_can_edit_perf(self, plan):
        bd = QuarterlyBreakdown.objects.filter(plan=plan).first()
        if not bd:
            return False
        return bd.status in [PlanStatus.APPROVED, PlanStatus.VALIDATED, PlanStatus.FINAL_APPROVED]

    def _allow_perf_edit(self, request, plan):
        role = getattr(request.user, 'role', '')
        if role == 'STATE_MINISTER':
            return True
        if role == 'ADVISOR':
            return self._advisor_can_edit_perf(plan)
        return False

    def create(self, request, *args, **kwargs):
        plan_id = request.data.get('plan')
        try:
            plan = AnnualPlan.objects.get(id=plan_id)
        except AnnualPlan.DoesNotExist:
            return Response({'detail': 'Invalid plan.'}, status=status.HTTP_400_BAD_REQUEST)
        if not self._allow_perf_edit(request, plan):
            return Response({'detail': 'Not allowed to create performance at this time (requires approved quarterly plan or proper role).'}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if not self._allow_perf_edit(request, obj.plan):
            return Response({'detail': 'Not allowed to update performance at this time (requires approved quarterly plan or proper role).'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        obj = self.get_object()
        now = timezone.now()
        if obj.status not in [PerformanceStatus.DRAFT, PerformanceStatus.REJECTED]:
            return Response({'detail': 'Only draft or rejected performance can be submitted.'}, status=status.HTTP_400_BAD_REQUEST)
        if not within_quarter_submission_window(now, obj.quarter):
            return Response({'detail': 'Submission window closed (10 days after quarter end).'}, status=status.HTTP_400_BAD_REQUEST)
        obj.status = PerformanceStatus.SUBMITTED
        obj.submitted_by = request.user
        obj.submitted_at = now
        obj.save()
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        obj = self.get_object()
        if request.user.role != 'STATE_MINISTER':
            return Response({'detail': 'Only State Minister can approve.'}, status=status.HTTP_403_FORBIDDEN)
        if obj.status != PerformanceStatus.SUBMITTED:
            return Response({'detail': 'Only submitted performance can be approved.'}, status=status.HTTP_400_BAD_REQUEST)
        obj.status = PerformanceStatus.APPROVED
        obj.reviewed_by = request.user
        obj.reviewed_at = timezone.now()
        obj.review_comment = request.data.get('comment', '')
        obj.save()
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        obj = self.get_object()
        if request.user.role != 'STRATEGIC_STAFF':
            return Response({'detail': 'Only Strategic Affairs Staff can validate.'}, status=status.HTTP_403_FORBIDDEN)
        if obj.status != PerformanceStatus.APPROVED:
            return Response({'detail': 'Only approved performance can be validated.'}, status=status.HTTP_400_BAD_REQUEST)
        obj.status = PerformanceStatus.VALIDATED
        obj.validated_by = request.user
        obj.validated_at = timezone.now()
        obj.save()
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def final_approve(self, request, pk=None):
        obj = self.get_object()
        if request.user.role != 'EXECUTIVE':
            return Response({'detail': 'Only Executive Officer can final approve.'}, status=status.HTTP_403_FORBIDDEN)
        if obj.status != PerformanceStatus.VALIDATED:
            return Response({'detail': 'Only validated performance can be final approved.'}, status=status.HTTP_400_BAD_REQUEST)
        obj.status = PerformanceStatus.FINAL_APPROVED
        obj.final_approved_by = request.user
        obj.final_approved_at = timezone.now()
        obj.save()
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        obj = self.get_object()
        # Only reviewer roles can reject
        if request.user.role not in ['STATE_MINISTER', 'STRATEGIC_STAFF', 'EXECUTIVE']:
            return Response({'detail': 'Only reviewer roles can reject.'}, status=status.HTTP_403_FORBIDDEN)
        # Strategic Staff must provide a rejection note
        comment = (request.data.get('comment', '') or '').strip()
        if request.user.role == 'STRATEGIC_STAFF' and not comment:
            return Response({'detail': 'Rejection note is required for Strategic Affairs Staff.'}, status=status.HTTP_400_BAD_REQUEST)
        if obj.status not in [PerformanceStatus.SUBMITTED, PerformanceStatus.APPROVED, PerformanceStatus.VALIDATED]:
            return Response({'detail': 'Only submitted or in-approval performance can be rejected.'}, status=status.HTTP_400_BAD_REQUEST)
        obj.status = PerformanceStatus.REJECTED
        obj.review_comment = comment
        obj.reviewed_by = request.user
        obj.reviewed_at = timezone.now()
        obj.save()
        return Response(self.get_serializer(obj).data)


class FileAttachmentViewSet(viewsets.ModelViewSet):
    queryset = FileAttachment.objects.select_related('annual_plan', 'performance').all()
    serializer_class = FileAttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

# Create your views here.


class SuperuserOnlyPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class SubmissionWindowViewSet(viewsets.ModelViewSet):
    queryset = SubmissionWindow.objects.all().order_by('-year', 'window_type')
    serializer_class = SubmissionWindowSerializer
    permission_classes = [SuperuserOnlyPermission]
