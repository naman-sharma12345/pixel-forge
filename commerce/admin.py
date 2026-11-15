from django.contrib import admin

from core.admin_utils import export_csv

from .models import CartItem, Order, OrderItem, Purchase


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    autocomplete_fields = ('asset', 'creator')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('reference', 'user', 'subtotal', 'platform_fee', 'total', 'status', 'created_at', 'paid_at')
    list_filter = ('status', 'created_at')
    search_fields = ('reference', 'user__username', 'user__email')
    autocomplete_fields = ('user',)
    readonly_fields = ('reference',)
    date_hierarchy = 'created_at'
    inlines = [OrderItemInline]
    actions = [export_csv]


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ('user', 'asset', 'price_paid', 'download_count', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'asset__title')
    autocomplete_fields = ('user', 'asset', 'order')
    readonly_fields = ('download_count', 'last_downloaded_at')
    actions = [export_csv]


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ('user', 'asset', 'added_at')
    autocomplete_fields = ('user', 'asset')


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('title', 'order', 'price', 'creator', 'creator_earning')
    search_fields = ('title', 'order__reference')
    autocomplete_fields = ('order', 'asset', 'creator')
