from django.conf import settings


def site(request):
    """Globals for every template: cart count, wishlist / owned ids (for asset cards) and the active nav link."""
    ctx = {
        'SITE_NAME': 'Pixel Forge',
        'PLATFORM_FEE_PERCENT': settings.PLATFORM_FEE_PERCENT,
        'CREATOR_SHARE': 100 - settings.PLATFORM_FEE_PERCENT,
        'cart_count': 0, 'wishlist_ids': set(), 'owned_ids': set(), 'nav_active': '',
    }
    match = getattr(request, 'resolver_match', None)
    if match and match.url_name == 'explore':
        category, free = request.GET.get('category'), request.GET.get('free')
        ctx['nav_active'] = 'sfx' if category == 'sfx' else 'music' if category == 'music' else 'free' if free else 'explore'
    user = getattr(request, 'user', None)
    if user is not None and user.is_authenticated:
        ctx['cart_count'] = user.cart_items.count()
        ctx['wishlist_ids'] = set(user.wishlist.values_list('id', flat=True))
        ctx['owned_ids'] = set(user.purchases.values_list('asset_id', flat=True))
    return ctx
