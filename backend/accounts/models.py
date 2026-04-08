from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """
    Custom User model for the Clinic Scheduler.
    We use AbstractUser to keep Django's internal auth logic 
    but allow for custom profile fields.
    """
    
    # We set email to unique to allow for email-based login later
    email = models.EmailField(unique=True)
    
    # Custom fields for the clinic context
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    
    # You can add more fields here as your project grows (e.g., bio, profile_pic)

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.username} ({self.get_full_name() or 'No Name'})"