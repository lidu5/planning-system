from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    class Roles(models.TextChoices):
        SUPERADMIN = 'SUPERADMIN', 'Super Admin'
        ADVISOR = 'ADVISOR', 'Advisor'
        STATE_MINISTER = 'STATE_MINISTER', 'State Minister'
        STRATEGIC_STAFF = 'STRATEGIC_STAFF', 'Strategic Affairs Staff'
        EXECUTIVE = 'EXECUTIVE', 'Strategic Affairs Executive Officer'
        MINISTER_VIEW = 'MINISTER_VIEW', 'Minister (Read Only)'

    role = models.CharField(max_length=32, choices=Roles.choices, default=Roles.ADVISOR)
    sector = models.ForeignKey('indicators.StateMinisterSector', on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    department = models.ForeignKey('indicators.Department', on_delete=models.SET_NULL, null=True, blank=True, related_name='users')

    def __str__(self):
        return f"{self.username} ({self.role})"

# Create your models here.

