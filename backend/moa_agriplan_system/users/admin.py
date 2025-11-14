from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django import forms
from .models import User

class UserAdminForm(forms.ModelForm):
    class Meta:
        model = User
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        role_field = self.fields.get('role')
        if role_field:
            # If the instance is not a Django superuser, hide the SUPERADMIN role from choices
            is_superuser_instance = bool(getattr(self.instance, 'is_superuser', False))
            if not is_superuser_instance:
                role_field.choices = [
                    (value, label) for value, label in role_field.choices
                    if value != User.Roles.SUPERADMIN
                ]

    def clean_role(self):
        role = self.cleaned_data.get('role')
        # Prevent assigning SUPERADMIN role unless the user is already a Django superuser
        if role == User.Roles.SUPERADMIN and not getattr(self.instance, 'is_superuser', False):
            raise forms.ValidationError("Role 'SUPERADMIN' cannot be assigned here. Create a Django superuser via CLI.")
        return role


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    form = UserAdminForm
    list_display = ('username', 'email', 'role', 'is_staff', 'is_superuser', 'sector', 'department')
    list_filter = ('role', 'is_staff', 'is_superuser', 'is_active', 'sector', 'department')
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email')}),
        ('Role & Scope', {'fields': ('role', 'sector', 'department')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'role', 'sector', 'department', 'is_staff', 'is_active'),
        }),
    )
    search_fields = ('username', 'email')
    ordering = ('username',)
