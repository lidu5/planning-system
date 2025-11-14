from django.db import models

# Create your models here.

class StateMinisterSector(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name


class Department(models.Model):
    name = models.CharField(max_length=255)
    sector = models.ForeignKey(StateMinisterSector, on_delete=models.CASCADE, related_name='departments')

    class Meta:
        unique_together = ('name', 'sector')

    def __str__(self):
        return f"{self.name} - {self.sector.name}"


class Indicator(models.Model):
    name = models.CharField(max_length=255)
    unit = models.CharField(max_length=64, blank=True)
    description = models.TextField(blank=True)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='indicators')

    class Meta:
        unique_together = ('name', 'department')

    def __str__(self):
        return f"{self.name} ({self.department.name})"
