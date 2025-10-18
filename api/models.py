from django.db import models
from django.contrib.auth.models import User
import uuid

class ScheduleTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    testing_intervals = models.JSONField()  # List of week numbers
    is_preset = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class FTCycleTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    cycles = models.JSONField()  # Array of {cycle, thawDay, testDay} objects
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Product(models.Model):
    FT_CYCLE_CHOICES = [
        ('consecutive', 'Consecutive'),
        ('weekly', 'Weekly'),
        ('biweekly', 'Biweekly'),
        ('custom', 'Custom'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    assignee = models.CharField(max_length=255)
    start_date = models.CharField(max_length=50)  # Store as YYYY-MM-DD string to match frontend
    schedule_template = models.ForeignKey(ScheduleTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    ft_cycle_type = models.CharField(max_length=20, choices=FT_CYCLE_CHOICES, default='consecutive')
    ft_cycle_custom = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name}"

class Task(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=50)  # 'weekly', 'ft-thaw', 'ft-test'
    due_date = models.CharField(max_length=50)  # Store as YYYY-MM-DD string
    cycle = models.CharField(max_length=100, null=True, blank=True)  # 'Initial', 'Week 1', 'Cycle 1', etc.
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.product.name} - {self.name}"