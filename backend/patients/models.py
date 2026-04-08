from django.db import models
from facilities.models import Facility

class Patient(models.Model):
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
        ('U', 'Unknown'),
    ]

    facility = models.ForeignKey(
        Facility, 
        on_delete=models.CASCADE, 
        related_name="patients"
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, default='U')
    
    # Optional: for internal clinic tracking
    chart_number = models.CharField(max_length=50, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Ensures a patient is unique to a facility to prevent duplicates
        unique_together = ('facility', 'first_name', 'last_name', 'date_of_birth')
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f"{self.last_name}, {self.first_name} ({self.facility.name})"