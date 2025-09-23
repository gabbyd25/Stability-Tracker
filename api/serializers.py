from rest_framework import serializers
from .models import ScheduleTemplate, FTCycleTemplate, Product, Task
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class ScheduleTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleTemplate
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

class FTCycleTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FTCycleTemplate
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'user']

class ProductSerializer(serializers.ModelSerializer):
    schedule_template = ScheduleTemplateSerializer(read_only=True)
    schedule_template_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'user']

class TaskSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Task
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'user']