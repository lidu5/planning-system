from rest_framework import serializers
from .models import User
from indicators.models import StateMinisterSector, Department


class UserSerializer(serializers.ModelSerializer):
    sector = serializers.SerializerMethodField(read_only=True)
    department = serializers.SerializerMethodField(read_only=True)
    sector_id = serializers.PrimaryKeyRelatedField(queryset=StateMinisterSector.objects.all(), source='sector', write_only=True, allow_null=True, required=False)
    department_id = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), source='department', write_only=True, allow_null=True, required=False)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role',
                  'sector', 'department', 'sector_id', 'department_id', 'is_active', 'password']

    def get_sector(self, obj):
        if obj.sector:
            return {'id': obj.sector.id, 'name': obj.sector.name}
        return None

    def get_department(self, obj):
        if obj.department:
            return {'id': obj.department.id, 'name': obj.department.name}
        return None

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password is not None and password != '':
            user.set_password(password)
            user.save()
        return user
