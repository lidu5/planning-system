from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    class Roles(models.TextChoices):
        ADVISOR = 'ADVISOR', 'Advisor'
        STATE_MINISTER = 'STATE_MINISTER', 'State Minister'
        STRATEGIC_STAFF = 'STRATEGIC_STAFF', 'Strategic Affairs Staff'
        EXECUTIVE = 'EXECUTIVE', 'Strategic Affairs Executive Officer'
        LEAD_EXECUTIVE_BODY = 'LEAD_EXECUTIVE_BODY', 'Lead Executive Body'
        MINISTER_VIEW = 'MINISTER_VIEW', 'Minister (Read Only)'

    role = models.CharField(max_length=32, choices=Roles.choices, default=Roles.ADVISOR)
    sector = models.ForeignKey('indicators.StateMinisterSector', on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    department = models.ForeignKey('indicators.Department', on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)

    def __str__(self):
        return f"{self.username} ({self.role})"

# Create your models here.

