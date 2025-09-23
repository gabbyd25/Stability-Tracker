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
    freeze_hours = models.IntegerField()
    thaw_hours = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Product(models.Model):
    TEST_TYPE_CHOICES = [
        ('RT', 'Real-Time'),
        ('ACC', 'Accelerated'),
        ('LT', 'Long-Term'),
    ]

    FT_CYCLE_CHOICES = [
        ('consecutive', 'Consecutive'),
        ('weekly', 'Weekly'),
        ('biweekly', 'Biweekly'),
        ('custom', 'Custom'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    product_number = models.CharField(max_length=255)
    product_name = models.CharField(max_length=255)
    lot_number = models.CharField(max_length=255)
    sample_size = models.IntegerField()
    start_date = models.DateTimeField()
    test_type = models.CharField(max_length=3, choices=TEST_TYPE_CHOICES)
    schedule_template = models.ForeignKey(ScheduleTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    ft_cycle_type = models.CharField(max_length=20, choices=FT_CYCLE_CHOICES, default='consecutive')
    ft_cycle_custom = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.product_name} - {self.lot_number}"

class Task(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    due_date = models.DateTimeField()
    description = models.TextField()
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.product.product_name} - {self.description}"