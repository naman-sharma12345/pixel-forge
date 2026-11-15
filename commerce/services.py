"""Business logic for the cart and the simulated checkout. Views stay thin."""
from django.db import transaction
from django.utils import timezone

from catalog.models import Asset

from .models import CartItem, Order, OrderItem, Purchase, earning_for, fee_for


class CartError(Exception):
    """A cart rule was broken. The message is safe to show to the user."""


def check_can_buy(user, asset):
    """Enforce the cart rules: published, not yours, not owned, not free."""
    if asset.status != Asset.STATUS_PUBLISHED:
        raise CartError('This asset is no longer available.')
    if asset.creator_id == user.id:
        raise CartError('You cannot buy your own asset.')
    if Purchase.objects.filter(user=user, asset=asset).exists():
        raise CartError('You already own this.')
    if asset.is_free:
        raise CartError('Free assets are claimed, not bought.')


def add_to_cart(user, asset):
    """Returns True when newly added, False when it was already in the cart."""
    check_can_buy(user, asset)
    _, created = CartItem.objects.get_or_create(user=user, asset=asset)
    return created


def buyable_assets(user, assets):
    """Drop anything the user can no longer buy (owned, own, free, unpublished)."""
    owned = set(Purchase.objects.filter(user=user).values_list('asset_id', flat=True))
    return [a for a in assets if a.status == Asset.STATUS_PUBLISHED and a.creator_id != user.id and a.id not in owned and not a.is_free]


@transaction.atomic
def create_order(user, assets):
    """Create a 'created' order with items. The platform fee comes out of the creator's share."""
    assets = buyable_assets(user, assets)
    if not assets:
        raise CartError('There is nothing to check out.')
    subtotal = sum(a.price for a in assets)
    order = Order.objects.create(user=user, subtotal=subtotal, platform_fee=fee_for(subtotal), total=subtotal)
    OrderItem.objects.bulk_create([
        OrderItem(order=order, asset=a, title=a.title, price=a.price, creator=a.creator, creator_earning=earning_for(a.price)) for a in assets
    ])
    order.platform_fee = sum(i.price - i.creator_earning for i in order.items.all())
    order.save(update_fields=['platform_fee'])
    return order


@transaction.atomic
def confirm_payment(order, outcome):
    """Simulated payment. Idempotent: confirming a paid order again changes nothing.

    Returns 'paid', 'already_paid' or 'failed'."""
    order = Order.objects.select_for_update().get(pk=order.pk)
    if order.status == Order.STATUS_PAID:
        return 'already_paid'
    if outcome != 'success':
        order.status = Order.STATUS_FAILED
        order.save(update_fields=['status'])
        return 'failed'
    order.status = Order.STATUS_PAID
    order.paid_at = timezone.now()
    order.save(update_fields=['status', 'paid_at'])
    asset_ids = []
    for item in order.items.select_related('asset'):
        if item.asset_id:
            Purchase.objects.get_or_create(user=order.user, asset_id=item.asset_id, defaults={'order': order, 'price_paid': item.price})
            asset_ids.append(item.asset_id)
    CartItem.objects.filter(user=order.user, asset_id__in=asset_ids).delete()
    return 'paid'


def claim_free(user, asset):
    """Returns True when newly claimed."""
    if asset.status != Asset.STATUS_PUBLISHED:
        raise CartError('This asset is no longer available.')
    if asset.creator_id == user.id:
        raise CartError('This is your own asset.')
    if not asset.is_free:
        raise CartError('This asset is not free.')
    _, created = Purchase.objects.get_or_create(user=user, asset=asset, defaults={'order': None, 'price_paid': 0})
    return created
