import secrets
import string

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


def fee_for(amount):
    """Platform fee in whole rupees (PLATFORM_FEE_PERCENT of the amount, rounded)."""
    return int(round(amount * settings.PLATFORM_FEE_PERCENT / 100))


def earning_for(amount):
    return amount - fee_for(amount)


def make_reference():
    alphabet = string.ascii_uppercase + string.digits
    return 'PF-' + ''.join(secrets.choice(alphabet) for _ in range(8))


class CartItem(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cart_items')
    asset = models.ForeignKey('catalog.Asset', on_delete=models.CASCADE, related_name='cart_items')
    added_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-added_at']
        constraints = [models.UniqueConstraint(fields=['user', 'asset'], name='one_cart_row_per_asset')]

    def __str__(self):
        return f'{self.user} · {self.asset}'

    def clean(self):
        if self.asset_id and self.user_id:
            if self.asset.creator_id == self.user_id:
                raise ValidationError('You cannot buy your own asset.')
            if self.asset.is_free:
                raise ValidationError('Free assets are claimed, not bought.')
            if Purchase.objects.filter(user_id=self.user_id, asset_id=self.asset_id).exists():
                raise ValidationError('You already own this asset.')


class Order(models.Model):
    STATUS_CREATED, STATUS_PAID, STATUS_FAILED = 'created', 'paid', 'failed'
    STATUS_CHOICES = [(STATUS_CREATED, 'Created'), (STATUS_PAID, 'Paid'), (STATUS_FAILED, 'Failed')]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    reference = models.CharField(max_length=12, unique=True, default=make_reference, editable=False)
    subtotal = models.PositiveIntegerField(default=0)
    platform_fee = models.PositiveIntegerField(default=0)
    total = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=8, choices=STATUS_CHOICES, default=STATUS_CREATED, db_index=True)
    created_at = models.DateTimeField(default=timezone.now)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.reference} ({self.get_status_display()})'

    def clean(self):
        if self.total != self.subtotal:
            raise ValidationError('Total must equal the subtotal (the fee is taken from the creator share).')
        if self.status == self.STATUS_PAID and not self.paid_at:
            self.paid_at = timezone.now()

    @property
    def is_paid(self):
        return self.status == self.STATUS_PAID


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    asset = models.ForeignKey('catalog.Asset', on_delete=models.SET_NULL, null=True, blank=True, related_name='order_items')
    title = models.CharField(max_length=80)
    price = models.PositiveIntegerField()
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sale_items')
    creator_earning = models.PositiveIntegerField()

    def __str__(self):
        return f'{self.title} (₹{self.price})'


class Purchase(models.Model):
    """The ownership record. One row per (user, asset); free claims have no order."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='purchases')
    asset = models.ForeignKey('catalog.Asset', on_delete=models.CASCADE, related_name='purchases')
    order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchases')
    price_paid = models.PositiveIntegerField(default=0)
    download_count = models.PositiveIntegerField(default=0)
    last_downloaded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']
        constraints = [models.UniqueConstraint(fields=['user', 'asset'], name='one_purchase_per_user_per_asset')]

    def __str__(self):
        return f'{self.user} owns {self.asset}'
