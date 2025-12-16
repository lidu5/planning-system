from rest_framework import serializers
from .models import StateMinisterSector, Department, Indicator, IndicatorGroup


class StateMinisterSectorSerializer(serializers.ModelSerializer):
    class Meta:
        model = StateMinisterSector
        fields = ['id', 'name']


class DepartmentSerializer(serializers.ModelSerializer):
    sector = StateMinisterSectorSerializer(read_only=True)
    sector_id = serializers.PrimaryKeyRelatedField(
        queryset=StateMinisterSector.objects.all(), source='sector', write_only=True
    )

    class Meta:
        model = Department
        fields = ['id', 'name', 'sector', 'sector_id']


class IndicatorGroupSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), source='department', write_only=True
    )

    class Meta:
        model = IndicatorGroup
        fields = ['id', 'name', 'department', 'department_id']


class IndicatorSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), source='department', write_only=True
    )
    groups = IndicatorGroupSerializer(many=True, read_only=True)
    group_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=IndicatorGroup.objects.all(),
        source='groups',
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = Indicator
        fields = ['id', 'name', 'unit', 'description', 'department', 'department_id', 'groups', 'group_ids']
