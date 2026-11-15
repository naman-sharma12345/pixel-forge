from datetime import timedelta

from django.db.models import Count, Q
from django.http import HttpResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.cache import cache_control

from catalog.models import Asset, Category, Tag

from . import pixelart


def _rail(qs, n=8):
    return list(qs[:n])


def home(request):
    """Hero, category grid with counts, and rails (featured, trending, newest, freebies, sounds)."""
    published = Asset.objects.published()
    cards = published.for_cards()
    since = timezone.now() - timedelta(days=30)
    trending_ids = list(
        published.annotate(recent=Count('purchases', filter=Q(purchases__created_at__gte=since), distinct=True))
        .filter(recent__gt=0).order_by('-recent', '-created_at').values_list('id', flat=True)[:8]
    )
    trending = list(cards.filter(id__in=trending_ids))
    trending.sort(key=lambda a: trending_ids.index(a.id))
    if len(trending) < 4:  # fall back to all-time bestsellers on a fresh database
        trending = _rail(cards.order_by('-n_sales', '-created_at'))

    categories = Category.objects.annotate(
        count=Count('assets', filter=Q(assets__status=Asset.STATUS_PUBLISHED))
    )
    stats = {
        'assets': published.count(),
        'creators': published.values('creator').distinct().count(),
        'free': published.filter(price=0).count(),
        'sounds': published.filter(category__media_kind=Category.MEDIA_AUDIO).count(),
    }
    popular_tags = list(Tag.objects.annotate(n=Count('assets', filter=Q(assets__status=Asset.STATUS_PUBLISHED))).filter(n__gt=0).order_by('-n', 'name')[:8])
    hero = _rail(cards.filter(category__media_kind='image').order_by('-is_featured', '-n_sales'), 3)
    rails = [
        {'title': 'Featured this week', 'subtitle': 'Hand-picked packs our team keeps coming back to.', 'icon': 'star',
         'assets': _rail(cards.filter(is_featured=True).order_by('-created_at')), 'more': '/explore/?sort=popular'},
        {'title': 'Trending now', 'subtitle': 'What indie devs are buying this month.', 'icon': 'flame',
         'assets': trending, 'more': '/explore/?sort=popular'},
        {'title': 'Hear it', 'subtitle': 'Press play. Only one sound plays at a time, everywhere.', 'icon': 'headphones',
         'assets': _rail(cards.filter(category__media_kind='audio').order_by('-n_sales')), 'more': '/explore/?media_kind=audio'},
        {'title': 'Fresh drops', 'subtitle': 'Brand new from the forge.', 'icon': 'sparkles',
         'assets': _rail(cards.order_by('-created_at')), 'more': '/explore/?sort=newest'},
        {'title': 'Free to grab', 'subtitle': 'Zero rupees. Still great.', 'icon': 'gift',
         'assets': _rail(cards.filter(price=0).order_by('-created_at')), 'more': '/explore/?free=1'},
    ]
    return render(request, 'core/home.html', {'categories': categories, 'stats': stats, 'rails': rails, 'hero_assets': hero, 'popular_tags': popular_tags})


@cache_control(max_age=86400)
def avatar(request, username):
    """Generated pixel avatar for users without an uploaded picture."""
    return HttpResponse(pixelart.avatar_png(username), content_type='image/png')


@cache_control(max_age=86400)
def banner(request, seed):
    """Landscape for profile banners and the auth art panel. Optional ?w=&h= (logical pixels)."""
    try:
        w = max(32, min(320, int(request.GET.get('w', 192))))
        h = max(16, min(320, int(request.GET.get('h', 48))))
    except ValueError:
        w, h = 192, 48
    return HttpResponse(pixelart.banner_png(seed, w, h), content_type='image/png')


@cache_control(max_age=86400)
def sheet(request, seed):
    """8-frame walking character sprite sheet."""
    return HttpResponse(pixelart.sprite_sheet_png(seed, 8, 'characters'), content_type='image/png')


@cache_control(max_age=86400)
def category_art(request, key):
    return HttpResponse(pixelart.thumbnail_png(f'category-{key}', key), content_type='image/png')


@cache_control(max_age=86400)
def illustration(request, kind):
    return HttpResponse(pixelart.illustration_png(kind), content_type='image/png')


def handler403(request, exception=None):
    return render(request, '403.html', status=403)


def handler404(request, exception=None):
    return render(request, '404.html', status=404)


def handler500(request):
    return render(request, '500.html', status=500)
