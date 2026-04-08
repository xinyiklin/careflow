from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    # Add your custom fields to the standard UserAdmin display
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'phone_number')
    
    # This allows you to edit your custom fields in the Admin "Edit User" page
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Profile Info', {'fields': ('phone_number',)}),
    )
    
    # This handles the "Add User" form in the Admin
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Custom Profile Info', {'fields': ('phone_number',)}),
    )