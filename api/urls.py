from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet,
    ScheduleTemplateViewSet,
    FTCycleTemplateViewSet,
    ProductViewSet,
    TaskViewSet
)

# Configure router without trailing slashes to match frontend expectations
router = DefaultRouter(trailing_slash=False)
router.register(r'users', UserViewSet)
router.register(r'schedule-templates', ScheduleTemplateViewSet, basename='scheduletemplate')
router.register(r'ft-cycle-templates', FTCycleTemplateViewSet, basename='ftcycletemplate')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'tasks', TaskViewSet, basename='task')

urlpatterns = [
    path('', include(router.urls)),
]