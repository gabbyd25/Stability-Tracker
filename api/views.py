from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q
from .models import ScheduleTemplate, FTCycleTemplate, Product, Task
from .serializers import (
    ScheduleTemplateSerializer,
    FTCycleTemplateSerializer,
    ProductSerializer,
    TaskSerializer,
    UserSerializer
)
from django.contrib.auth.models import User

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]  # For development - change to IsAuthenticated in production

    @action(detail=False, methods=['get'])
    def current(self, request):
        # For development, return a mock user
        user, created = User.objects.get_or_create(
            username='testuser',
            defaults={'email': 'test@example.com'}
        )
        serializer = self.get_serializer(user)
        return Response(serializer.data)

class ScheduleTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = ScheduleTemplateSerializer
    permission_classes = [AllowAny]  # For development

    def get_queryset(self):
        # Get user templates and presets
        if self.request.user.is_authenticated:
            return ScheduleTemplate.objects.filter(
                Q(user=self.request.user) | Q(is_preset=True)
            )
        # For development, return all templates
        return ScheduleTemplate.objects.all()

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            # For development
            user, _ = User.objects.get_or_create(username='testuser')
            serializer.save(user=user)

    @action(detail=False, methods=['get'])
    def presets(self, request):
        presets = ScheduleTemplate.objects.filter(is_preset=True)
        serializer = self.get_serializer(presets, many=True)
        return Response(serializer.data)

class FTCycleTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = FTCycleTemplateSerializer
    permission_classes = [AllowAny]  # For development

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return FTCycleTemplate.objects.filter(user=self.request.user)
        # For development
        user, _ = User.objects.get_or_create(username='testuser')
        return FTCycleTemplate.objects.filter(user=user)

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            # For development
            user, _ = User.objects.get_or_create(username='testuser')
            serializer.save(user=user)

class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]  # For development

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return Product.objects.filter(user=self.request.user)
        # For development
        user, _ = User.objects.get_or_create(username='testuser')
        return Product.objects.filter(user=user)

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            # For development
            user, _ = User.objects.get_or_create(username='testuser')
            serializer.save(user=user)

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [AllowAny]  # For development

    def get_queryset(self):
        if self.request.user.is_authenticated:
            queryset = Task.objects.filter(user=self.request.user)
        else:
            # For development
            user, _ = User.objects.get_or_create(username='testuser')
            queryset = Task.objects.filter(user=user)

        # Filter deleted tasks
        if self.action == 'deleted':
            return queryset.filter(deleted=True)
        return queryset.filter(deleted=False)

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            # For development
            user, _ = User.objects.get_or_create(username='testuser')
            serializer.save(user=user)

    @action(detail=False, methods=['get'])
    def deleted(self, request):
        deleted_tasks = self.get_queryset().filter(deleted=True)
        serializer = self.get_serializer(deleted_tasks, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        task = self.get_object()
        task.deleted = False
        task.deleted_at = None
        task.save()
        serializer = self.get_serializer(task)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def batch(self, request):
        tasks_data = request.data.get('tasks', [])
        created_tasks = []

        for task_data in tasks_data:
            serializer = self.get_serializer(data=task_data)
            if serializer.is_valid():
                self.perform_create(serializer)
                created_tasks.append(serializer.data)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        return Response(created_tasks, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        # Soft delete
        task = self.get_object()
        task.deleted = True
        from django.utils import timezone
        task.deleted_at = timezone.now()
        task.save()
        return Response(status=status.HTTP_204_NO_CONTENT)