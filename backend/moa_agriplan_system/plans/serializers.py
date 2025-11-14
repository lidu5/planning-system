from rest_framework import serializers
from .models import AnnualPlan, QuarterlyBreakdown, QuarterlyPerformance, FileAttachment, SubmissionWindow


class AnnualPlanSerializer(serializers.ModelSerializer):
    indicator_name = serializers.CharField(source='indicator.name', read_only=True)
    department_id = serializers.IntegerField(source='indicator.department.id', read_only=True)
    department_name = serializers.CharField(source='indicator.department.name', read_only=True)
    sector_id = serializers.IntegerField(source='indicator.department.sector.id', read_only=True)
    sector_name = serializers.CharField(source='indicator.department.sector.name', read_only=True)
    indicator_unit = serializers.CharField(source='indicator.unit', read_only=True)

    class Meta:
        model = AnnualPlan
        fields = [
            'id', 'year', 'indicator', 'indicator_name', 'indicator_unit',
            'department_id', 'department_name', 'sector_id', 'sector_name',
            'target', 'created_by', 'created_at'
        ]
        read_only_fields = ['created_by', 'created_at']


class QuarterlyBreakdownSerializer(serializers.ModelSerializer):
    total = serializers.DecimalField(max_digits=20, decimal_places=2, read_only=True)

    class Meta:
        model = QuarterlyBreakdown
        fields = [
            'id', 'plan', 'q1', 'q2', 'q3', 'q4', 'total', 'status',
            'submitted_by', 'submitted_at', 'reviewed_by', 'review_comment', 'reviewed_at',
            'validated_by', 'validated_at', 'final_approved_by', 'final_approved_at'
        ]
        read_only_fields = [
            'submitted_by', 'submitted_at', 'reviewed_by', 'reviewed_at',
            'validated_by', 'validated_at', 'final_approved_by', 'final_approved_at', 'total'
        ]

    # Do not enforce sum==target here; this will be checked during submit action
    # to allow drafting partial quarterly values.
    def validate(self, attrs):
        return attrs


class QuarterlyPerformanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuarterlyPerformance
        fields = [
            'id', 'plan', 'quarter', 'value', 'status',
            'submitted_by', 'submitted_at', 'reviewed_by', 'review_comment', 'reviewed_at',
            'validated_by', 'validated_at', 'final_approved_by', 'final_approved_at'
        ]
        read_only_fields = [
            'submitted_by', 'submitted_at', 'reviewed_by', 'reviewed_at',
            'validated_by', 'validated_at', 'final_approved_by', 'final_approved_at'
        ]


class FileAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = FileAttachment
        fields = ['id', 'uploaded_by', 'uploaded_at', 'file', 'annual_plan', 'performance', 'description']
        read_only_fields = ['uploaded_by', 'uploaded_at']


class SubmissionWindowSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubmissionWindow
        fields = [
            'id', 'window_type', 'year', 'always_open', 'start', 'end', 'active'
        ]
