from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from core.admin_utils import export_csv

from .models import CreatorProfile, User


class CreatorProfileInline(admin.StackedInline):
    model = CreatorProfile
    extra = 0


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ('username', 'email', 'first_name', 'role', 'is_active', 'date_joined', 'asset_count')
    list_filter = ('role', 'is_active', 'is_staff', 'date_joined')
    search_fields = ('username', 'email', 'first_name')
    readonly_fields = ('last_login', 'date_joined')
    filter_horizontal = ('wishlist', 'groups', 'user_permissions')
    inlines = [CreatorProfileInline]
    actions = ['ban_users', 'unban_users', 'make_creators', export_csv]
    fieldsets = DjangoUserAdmin.fieldsets + (
        ('Pixel Forge', {'fields': ('role', 'bio', 'avatar', 'website', 'twitter', 'itchio', 'github', 'wishlist')}),
    )
    add_fieldsets = DjangoUserAdmin.add_fieldsets + (
        (None, {'fields': ('email', 'first_name', 'role')}),
    )

    @admin.display(description='Assets')
    def asset_count(self, obj):
        return obj.assets.count()

    @admin.action(description='Ban selected users (deactivate)')
    def ban_users(self, request, queryset):
        n = queryset.exclude(pk=request.user.pk).update(is_active=False)
        self.message_user(request, f'{n} user(s) banned.')

    @admin.action(description='Unban selected users (activate)')
    def unban_users(self, request, queryset):
        self.message_user(request, f'{queryset.update(is_active=True)} user(s) unbanned.')

    @admin.action(description='Promote selected users to creator')
    def make_creators(self, request, queryset):
        n = 0
        for user in queryset.filter(role=User.ROLE_BUYER):
            user.role = User.ROLE_CREATOR
            user.save()
            CreatorProfile.objects.get_or_create(user=user)
            n += 1
        self.message_user(request, f'{n} user(s) promoted.')


@admin.register(CreatorProfile)
class CreatorProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'tagline', 'banner_seed', 'created_at')
    search_fields = ('user__username', 'tagline')
    autocomplete_fields = ('user',)
    readonly_fields = ('created_at',)
