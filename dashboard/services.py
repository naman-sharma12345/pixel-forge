"""ORM aggregation for the dashboards and reports (Sum, Count, Avg, TruncDate)."""
from datetime import date, timedelta

from django.contrib.sessions.models import Session
from django.db.models import Avg, Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from accounts.models import User
from catalog.models import Asset
from commerce.models import Order, OrderItem

RANGES = {'7d': 7, '30d': 30, '90d': 90}


def local_today():
    return timezone.localdate()


def day_labels(days, end=None):
    end = end or local_today()
    return [end - timedelta(days=d) for d in range(days - 1, -1, -1)]


def creator_stats(user, range_key='30d'):
    days = RANGES.get(range_key, 30)
    labels = day_labels(days)
    start = timezone.make_aware(timezone.datetime.combine(labels[0], timezone.datetime.min.time()))
    items = OrderItem.objects.filter(creator=user, order__status=Order.STATUS_PAID, order__paid_at__gte=start)
    totals = items.aggregate(revenue=Sum('creator_earning'), sales=Count('id'))
    mine = Asset.objects.filter(creator=user)
    asset_totals = mine.aggregate(downloads=Sum('downloads'), views=Sum('views'), assets=Count('id'))
    rated = mine.aggregate(avg=Avg('reviews__rating'))['avg'] or 0
    wishlists = Asset.wishlisted_by.through.objects.filter(asset__creator=user).count()

    per_day = {r['day']: r for r in items.annotate(day=TruncDate('order__paid_at')).values('day').annotate(revenue=Sum('creator_earning'), sales=Count('id'))}
    series = [{'date': d.isoformat(), 'revenue': per_day.get(d, {}).get('revenue', 0) or 0, 'sales': per_day.get(d, {}).get('sales', 0) or 0} for d in labels]

    by_cat = list(items.values('asset__category__key', 'asset__category__name').annotate(revenue=Sum('creator_earning'), sales=Count('id')).order_by('-revenue'))
    top = list(items.exclude(asset=None).values('asset_id').annotate(revenue=Sum('creator_earning'), sales=Count('id')).order_by('-revenue')[:5])
    assets = {a.id: a for a in Asset.objects.filter(id__in=[t['asset_id'] for t in top])}
    top_assets = [{'asset': assets[t['asset_id']], 'revenue': t['revenue'], 'sales': t['sales']} for t in top if t['asset_id'] in assets]
    return {
        'days': days,
        'totals': {'revenue': totals['revenue'] or 0, 'sales': totals['sales'] or 0, 'downloads': asset_totals['downloads'] or 0,
                   'views': asset_totals['views'] or 0, 'assets': asset_totals['assets'] or 0, 'avg_rating': round(rated, 1), 'wishlists': wishlists},
        'series': series, 'by_category': by_cat, 'top_assets': top_assets,
    }


def sales_queryset(user, start=None, end=None):
    qs = OrderItem.objects.filter(creator=user, order__status=Order.STATUS_PAID).select_related('order__user', 'asset').order_by('-order__paid_at')
    if start:
        qs = qs.filter(order__paid_at__date__gte=start)
    if end:
        qs = qs.filter(order__paid_at__date__lte=end)
    return qs


def admin_stats():
    paid = Order.objects.filter(status=Order.STATUS_PAID)
    sums = paid.aggregate(revenue=Sum('total'), fees=Sum('platform_fee'), n=Count('id'))
    labels = day_labels(30)
    since = timezone.make_aware(timezone.datetime.combine(labels[0], timezone.datetime.min.time()))
    signups = {r['day']: r['n'] for r in User.objects.filter(date_joined__gte=since).annotate(day=TruncDate('date_joined')).values('day').annotate(n=Count('id'))}
    revenue = {r['day']: r['r'] for r in paid.filter(paid_at__gte=since).annotate(day=TruncDate('paid_at')).values('day').annotate(r=Sum('total'))}
    return {
        'users': User.objects.count(), 'creators': User.objects.filter(role__in=['creator', 'admin']).count(), 'assets': Asset.objects.count(),
        'orders': sums['n'] or 0, 'revenue': sums['revenue'] or 0, 'fees': sums['fees'] or 0,
        'signups': [{'date': d.isoformat(), 'count': signups.get(d, 0)} for d in labels],
        'revenue_series': [{'date': d.isoformat(), 'revenue': revenue.get(d, 0) or 0} for d in labels],
    }


def sign_out_everywhere(user):
    """Delete every session that belongs to this user (used when banning)."""
    for s in Session.objects.filter(expire_date__gte=timezone.now()):
        if s.get_decoded().get('_auth_user_id') == str(user.pk):
            s.delete()


def month_bounds(value):
    """'2026-05' -> (first day, last day). Falls back to the current month."""
    try:
        y, m = (int(p) for p in value.split('-'))
        first = date(y, m, 1)
    except (ValueError, AttributeError):
        today = local_today()
        first = date(today.year, today.month, 1)
    nxt = date(first.year + (first.month == 12), first.month % 12 + 1, 1)
    return first, nxt - timedelta(days=1)
