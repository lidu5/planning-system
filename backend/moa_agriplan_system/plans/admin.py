from django.contrib import admin
from .models import SubmissionWindow

@admin.register(SubmissionWindow)
class SubmissionWindowAdmin(admin.ModelAdmin):
    list_display = (
        'window_type',
        'year',
        'always_open',
        'start',
        'end',
        'active',
    )
    list_filter = (
        'window_type',
        'year',
        'always_open',
        'active',
    )
    search_fields = (
        'window_type',
    )
