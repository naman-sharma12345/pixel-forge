from django.contrib import admin

from core.admin_utils import export_csv

from .models import Asset, AssetPreview, Category, Review, Tag


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'key', 'media_kind', 'icon', 'order')
    list_editable = ('order',)
    search_fields = ('name', 'key')


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    search_fields = ('name',)


class AssetPreviewInline(admin.TabularInline):
    model = AssetPreview
    extra = 0
    max_num = 6


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ('title', 'creator', 'category', 'price', 'status', 'is_featured', 'views', 'downloads', 'created_at')
    list_filter = ('status', 'category', 'license', 'is_featured', 'created_at')
    search_fields = ('title', 'description', 'creator__username', 'tags__name')
    autocomplete_fields = ('creator', 'tags')
    readonly_fields = ('slug', 'views', 'downloads', 'updated_at')
    list_select_related = ('creator', 'category')
    date_hierarchy = 'created_at'
    inlines = [AssetPreviewInline]
    actions = ['feature', 'unfeature', 'publish', 'reject', export_csv]

    @admin.action(description='Feature selected assets')
    def feature(self, request, queryset):
        self.message_user(request, f'{queryset.update(is_featured=True)} asset(s) featured.')

    @admin.action(description='Remove selected assets from featured')
    def unfeature(self, request, queryset):
        self.message_user(request, f'{queryset.update(is_featured=False)} asset(s) unfeatured.')

    @admin.action(description='Publish selected assets')
    def publish(self, request, queryset):
        n = queryset.update(status=Asset.STATUS_PUBLISHED, rejection_reason='')
        self.message_user(request, f'{n} asset(s) published.')

    @admin.action(description='Reject selected assets')
    def reject(self, request, queryset):
        n = queryset.update(status=Asset.STATUS_REJECTED, is_featured=False,
                            rejection_reason='Rejected by an administrator. See the guidelines.')
        self.message_user(request, f'{n} asset(s) rejected.')


@admin.register(AssetPreview)
class AssetPreviewAdmin(admin.ModelAdmin):
    list_display = ('asset', 'kind', 'order')
    list_filter = ('kind',)
    autocomplete_fields = ('asset',)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('asset', 'user', 'rating', 'created_at')
    list_filter = ('rating', 'created_at')
    search_fields = ('asset__title', 'user__username', 'comment')
    autocomplete_fields = ('asset', 'user')
    actions = [export_csv]
