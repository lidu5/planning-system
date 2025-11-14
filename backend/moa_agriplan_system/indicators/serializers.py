from rest_framework import serializers
from .models import StateMinisterSector, Department, Indicator


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


class IndicatorSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), source='department', write_only=True
    )

    class Meta:
        model = Indicator
        fields = ['id', 'name', 'unit', 'description', 'department', 'department_id']
