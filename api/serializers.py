from rest_framework import serializers
from .models import ScheduleTemplate, FTCycleTemplate, Product, Task
from django.contrib.auth.models import User
import json

class NullableUUIDField(serializers.UUIDField):
    """UUID field that converts empty strings to None"""
    def to_internal_value(self, data):
        if data == '' or data is None:
            return None
        return super().to_internal_value(data)

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class ScheduleTemplateSerializer(serializers.ModelSerializer):
    # Map snake_case to camelCase for frontend
    isPreset = serializers.BooleanField(source='is_preset', required=False)
    testingIntervals = serializers.JSONField(source='testing_intervals')
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = ScheduleTemplate
        fields = ['id', 'name', 'description', 'testingIntervals', 'isPreset', 'createdAt', 'updatedAt']
        read_only_fields = ['id', 'createdAt', 'updatedAt']

class FTCycleTemplateSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = FTCycleTemplate
        fields = ['id', 'name', 'description', 'cycles', 'createdAt', 'updatedAt']
        read_only_fields = ['id', 'createdAt', 'updatedAt', 'user']

class ProductSerializer(serializers.ModelSerializer):
    scheduleTemplate = ScheduleTemplateSerializer(source='schedule_template', read_only=True)
    scheduleTemplateId = NullableUUIDField(source='schedule_template_id', write_only=True, required=False, allow_null=True)
    startDate = serializers.CharField(source='start_date')
    ftCycleType = serializers.CharField(source='ft_cycle_type', required=False, allow_blank=True, default='consecutive')
    ftCycleCustom = serializers.JSONField(source='ft_cycle_custom', required=False, allow_null=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'name', 'assignee', 'startDate', 'scheduleTemplate', 'scheduleTemplateId',
                  'ftCycleType', 'ftCycleCustom', 'createdAt']
        read_only_fields = ['id', 'createdAt', 'user']

class TaskSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    productId = serializers.UUIDField(source='product_id', write_only=True)
    dueDate = serializers.CharField(source='due_date')
    completedAt = serializers.DateTimeField(source='completed_at', required=False, allow_null=True)
    deletedAt = serializers.DateTimeField(source='deleted_at', required=False, allow_null=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Task
        fields = ['id', 'productId', 'product', 'name', 'type', 'dueDate', 'completed',
                  'completedAt', 'cycle', 'deleted', 'deletedAt', 'createdAt']
        read_only_fields = ['id', 'createdAt', 'user']