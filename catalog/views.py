import csv

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.core.paginator import Paginator
from django.db.models import Avg, Case, Count, F, IntegerField, Q, Value, When
from django.http import Http404, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.templatetags.static import static
from django.urls import reverse
from django.views.decorators.http import require_POST

from accounts.decorators import creator_required
from commerce.models import CartItem, Purchase

from .forms import AssetForm, ExploreForm, ReviewForm
from .models import Asset, Category, Review, Tag
from core.templatetags.pf import inr

PAGE_SIZE = 24
LICENSE_BULLETS = {
    'cc0': ['Use it in any project, commercial or not.', 'No credit required, ever.', 'You can modify and redistribute it freely.'],
    'standard': ['Use it in games and apps you sell or give away.', 'Do not resell or redistribute the raw files.', 'Credit is appreciated but not required.'],
    'extended': ['Everything in Standard, plus redistribution rights.', 'You may share the files inside bundles or templates.', 'Still cannot resell the assets as-is.'],
}


def _studio_ctx(form, asset, mode):
    licenses = [(v, label.split(' - ')[0], label.split(' - ')[1], LICENSE_BULLETS[v]) for v, label in Asset.LICENSE_CHOICES]
    return {'form': form, 'asset': asset, 'mode': mode, 'categories': Category.objects.all(), 'dash': 'studio', 'licenses': licenses,
            'popular_tags': Tag.objects.values_list('name', flat=True)[:30]}
IS_AJAX = lambda request: request.headers.get('x-requested-with') == 'XMLHttpRequest'  # noqa: E731


# --------------------------------------------------------------------------- explore
def filtered_assets(form):
    """Apply a validated ExploreForm to the published assets. Returns (queryset, form_data)."""
    data = form.cleaned_data if form.is_valid() else {}
    qs = Asset.objects.published().for_cards().search(data.get('q'))
    if data.get('category'):
        qs = qs.filter(category=data['category'])
    if data.get('tags'):
        qs = qs.with_tags(data['tags'])
    if data.get('free'):
        qs = qs.filter(price=0)
    if data.get('min_price') is not None:
        qs = qs.filter(price__gte=data['min_price'])
    if data.get('max_price') is not None:
        qs = qs.filter(price__lte=data['max_price'])
    if data.get('license'):
        qs = qs.filter(license=data['license'])
    if data.get('media_kind'):
        qs = qs.filter(category__media_kind=data['media_kind'])
    sort = data.get('sort') or 'newest'
    if sort == 'relevance' and data.get('q'):
        q = data['q']
        rank = Case(When(title__istartswith=q, then=0), When(title__icontains=q, then=1), default=2, output_field=IntegerField())
        qs = qs.order_by(rank, '-n_sales')
    else:
        qs = qs.order_by({
            'newest': '-created_at', 'popular': '-n_sales', 'price-asc': 'price', 'price-desc': '-price',
            'top-rated': F('avg_rating').desc(nulls_last=True),
        }.get(sort, '-created_at'), '-created_at')
    return qs, data


def explore(request):
    form = ExploreForm(request.GET or None)
    qs, data = filtered_assets(form)
    page_obj = Paginator(qs, PAGE_SIZE).get_page(request.GET.get('page'))
    ctx = {'form': form, 'data': data, 'page_obj': page_obj, 'assets': page_obj.object_list, 'total': page_obj.paginator.count,
           'chips': active_chips(request, data)}
    if IS_AJAX(request):
        return render(request, 'catalog/_results.html', ctx)
    ctx['categories'] = Category.objects.annotate(count=Count('assets', filter=Q(assets__status=Asset.STATUS_PUBLISHED)))
    ctx['popular_tags'] = Tag.objects.annotate(count=Count('assets', filter=Q(assets__status=Asset.STATUS_PUBLISHED))).filter(count__gt=0).order_by('-count', 'name')[:20]
    ctx['licenses'] = Asset.LICENSE_CHOICES
    ctx['sort_choices'] = [(v, l) for v, l in form.fields['sort'].choices if v != 'relevance' or data.get('q')]
    ctx['category_obj'] = data.get('category')
    active = data.get('tags', [])
    ctx['active_tags'] = active
    ctx['tag_links'] = [(t.name, t.count, t.name in active) for t in ctx['popular_tags']]
    return render(request, 'catalog/explore.html', ctx)


def active_chips(request, data):
    """Removable filter chips: (label, url without that filter)."""
    def without(*keys, tag=None):
        params = request.GET.copy()
        for k in keys:
            params.pop(k, None)
        if tag:
            remaining = [t for t in data.get('tags', []) if t != tag]
            params.pop('tags', None)
            if remaining:
                params['tags'] = ','.join(remaining)
        params.pop('page', None)
        return '?' + params.urlencode() if params else '?'
    chips = []
    if data.get('q'):
        chips.append((f'“{data["q"]}”', without('q')))
    if data.get('category'):
        chips.append((data['category'].name, without('category')))
    for t in data.get('tags', []):
        chips.append((f'#{t}', without(tag=t)))
    if data.get('min_price') is not None or data.get('max_price') is not None:
        lo, hi = data.get('min_price') or 0, data.get('max_price')
        chips.append((f'₹{lo} – {"₹" + str(hi) if hi is not None else "any"}', without('min_price', 'max_price')))
    if data.get('free'):
        chips.append(('Free only', without('free')))
    if data.get('license'):
        chips.append((dict(Asset.LICENSE_CHOICES)[data['license']].split(' - ')[0], without('license')))
    if data.get('media_kind'):
        chips.append(({'image': 'Images', 'audio': 'Audio', 'other': 'Other'}[data['media_kind']], without('media_kind')))
    return chips


def explore_csv(request):
    """CSV export of the current Explore results (same filters as the page, capped at 1000 rows)."""
    qs, _ = filtered_assets(ExploreForm(request.GET or None))
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = 'attachment; filename="pixel-forge-explore.csv"'
    response.write('﻿')
    writer = csv.writer(response)
    writer.writerow(['Title', 'Category', 'Creator', 'Price (INR)', 'License', 'Sales', 'Rating', 'Reviews', 'URL'])
    for a in qs[:1000]:
        writer.writerow([a.title, a.category.name, a.creator.username, a.price, a.get_license_display(), a.sales, a.rating, a.review_count, request.build_absolute_uri(a.get_absolute_url())])
    return response


def category_redirect(request, key):
    get_object_or_404(Category, key=key)
    return redirect(f'{reverse("catalog:explore")}?category={key}')


def api_search(request):
    """Command-palette / explore live search: up to 6 assets as JSON."""
    q = request.GET.get('q', '').strip()[:100]
    if not q:
        return JsonResponse({'q': q, 'results': []})
    rank = Case(When(title__istartswith=q, then=0), When(title__icontains=q, then=1), default=2, output_field=IntegerField())
    qs = Asset.objects.published().search(q).select_related('creator', 'category').annotate(rank=rank).order_by('rank', '-views')[:6]
    return JsonResponse({'q': q, 'results': [{
        'title': a.title, 'slug': a.slug, 'url': a.get_absolute_url(), 'thumbnail': a.thumbnail.url,
        'price': a.price, 'price_label': inr(a.price), 'creator': a.creator.display_name, 'category': a.category.name,
    } for a in qs]})


# --------------------------------------------------------------------------- detail + reviews
def asset_detail(request, slug):
    asset = get_object_or_404(Asset.objects.select_related('creator', 'category').prefetch_related('previews', 'tags'), slug=slug)
    user = request.user
    is_mine = user.is_authenticated and asset.creator_id == user.id
    if asset.status != Asset.STATUS_PUBLISHED and not (is_mine or (user.is_authenticated and user.is_admin_role)):
        raise Http404
    if not is_mine:  # views count everyone except the creator
        Asset.objects.filter(pk=asset.pk).update(views=F('views') + 1)
        asset.views += 1
    owned = user.is_authenticated and Purchase.objects.filter(user=user, asset=asset).exists()
    in_cart = user.is_authenticated and CartItem.objects.filter(user=user, asset=asset).exists()
    in_wishlist = user.is_authenticated and user.wishlist.filter(pk=asset.pk).exists()

    reviews = asset.reviews.select_related('user')
    summary = reviews.aggregate(avg=Avg('rating'), count=Count('id'))
    dist = {r['rating']: r['n'] for r in reviews.values('rating').annotate(n=Count('id'))}
    distribution = [{'star': s, 'n': dist.get(s, 0), 'pct': round(dist.get(s, 0) / summary['count'] * 100) if summary['count'] else 0} for s in (5, 4, 3, 2, 1)]
    my_review = reviews.filter(user=user).first() if user.is_authenticated else None
    can_review = bool(owned and not is_mine)

    stats = Asset.objects.filter(pk=asset.pk).with_stats().first()
    asset.n_sales, asset.n_wishlists = stats.n_sales, stats.n_wishlists
    related = Asset.objects.published().for_cards().filter(category=asset.category).exclude(pk=asset.pk).order_by('-n_sales')[:6]
    more = Asset.objects.published().for_cards().filter(creator=asset.creator).exclude(pk=asset.pk).order_by('-n_sales')[:8]
    previews = asset.previews.all()
    images = [p.file.url for p in previews if p.kind == 'image'] or [asset.thumbnail.url]
    og_image = request.build_absolute_uri(asset.thumbnail.url)
    return render(request, 'catalog/detail.html', {
        'asset': asset, 'is_mine': is_mine, 'owned': owned, 'in_cart': in_cart, 'in_wishlist': in_wishlist,
        'reviews': reviews[:30], 'summary': summary, 'distribution': distribution, 'my_review': my_review, 'can_review': can_review,
        'review_form': ReviewForm(instance=my_review), 'related': related, 'more': more, 'images': images,
        'audio_previews': asset.audio_previews, 'og_image': og_image, 'tab': request.GET.get('tab', 'description'),
        'frames': asset.frames if asset.frames and asset.frames > 1 else 0,
    })


@login_required
@require_POST
def review_save(request, slug):
    asset = get_object_or_404(Asset.objects.published(), slug=slug)
    if asset.creator_id == request.user.id:
        messages.error(request, 'You cannot review your own asset.')
        return redirect(f'{asset.get_absolute_url()}?tab=reviews')
    if not Purchase.objects.filter(user=request.user, asset=asset).exists():
        messages.error(request, 'Only people who own this asset can review it.')
        return redirect(f'{asset.get_absolute_url()}?tab=reviews')
    existing = Review.objects.filter(asset=asset, user=request.user).first()
    form = ReviewForm(request.POST, instance=existing)
    if form.is_valid():
        review = form.save(commit=False)
        review.asset, review.user = asset, request.user
        review.full_clean(exclude=['rating', 'comment'])
        review.save()
        messages.success(request, 'Review updated.' if existing else 'Thanks! Your review is live.')
    else:
        messages.error(request, ' '.join(e for errs in form.errors.values() for e in errs) or 'Could not save your review.')
    return redirect(f'{asset.get_absolute_url()}?tab=reviews')


@login_required
@require_POST
def review_delete(request, pk):
    review = get_object_or_404(Review.objects.select_related('asset'), pk=pk)
    if review.user_id != request.user.id and not request.user.is_admin_role:
        raise PermissionDenied
    review.delete()
    messages.success(request, 'Review deleted.')
    return redirect(f'{review.asset.get_absolute_url()}?tab=reviews')


# --------------------------------------------------------------------------- creator studio
@creator_required
def studio_assets(request):
    status = request.GET.get('status', '')
    q = request.GET.get('q', '').strip()
    sort = request.GET.get('sort', 'newest')
    mine = Asset.objects.filter(creator=request.user)
    counts = {r['status']: r['n'] for r in mine.values('status').annotate(n=Count('id'))}
    qs = mine.for_cards()
    if status in dict(Asset.STATUS_CHOICES):
        qs = qs.filter(status=status)
    qs = qs.search(q).order_by({'newest': '-created_at', 'title': 'title', 'price': '-price', 'sales': '-n_sales', 'rating': F('avg_rating').desc(nulls_last=True)}.get(sort, '-created_at'))
    page_obj = Paginator(qs, 20).get_page(request.GET.get('page'))
    tabs = [('', 'All', sum(counts.values()))] + [(k, label, counts.get(k, 0)) for k, label in Asset.STATUS_CHOICES]
    return render(request, 'catalog/studio_assets.html', {'page_obj': page_obj, 'assets': page_obj.object_list, 'tabs': tabs, 'status': status, 'q': q, 'sort': sort, 'dash': 'studio',
        'sort_options': [('newest', 'Newest'), ('title', 'Title'), ('price', 'Price'), ('sales', 'Sales'), ('rating', 'Rating')]})


def _asset_form_response(request, form, asset, mode):
    if IS_AJAX(request):
        errors = {name: [str(e) for e in errs] for name, errs in form.errors.items()}
        return JsonResponse({'ok': False, 'errors': errors}, status=400)
    messages.error(request, 'Please fix the highlighted fields.')
    return render(request, 'catalog/studio_form.html', _studio_ctx(form, asset, mode))


@creator_required
def studio_new(request):
    form = AssetForm(request.POST or None, request.FILES or None, instance=Asset(creator=request.user))
    if request.method == 'POST':
        if form.is_valid():
            asset = form.save()
            messages.success(request, f'“{asset.title}” is live on the marketplace.')
            if IS_AJAX(request):
                return JsonResponse({'ok': True, 'redirect': asset.get_absolute_url(), 'message': 'Published'})
            return redirect(asset.get_absolute_url())
        return _asset_form_response(request, form, None, 'create')
    return render(request, 'catalog/studio_form.html', _studio_ctx(form, None, 'create'))


@creator_required
def studio_edit(request, pk):
    asset = get_object_or_404(Asset, pk=pk)
    if asset.creator_id != request.user.id and not request.user.is_admin_role:
        raise PermissionDenied
    form = AssetForm(request.POST or None, request.FILES or None, instance=asset)
    if request.method == 'POST':
        if form.is_valid():
            asset = form.save()
            messages.success(request, 'Changes saved.')
            if IS_AJAX(request):
                return JsonResponse({'ok': True, 'redirect': asset.get_absolute_url(), 'message': 'Saved'})
            return redirect(asset.get_absolute_url())
        return _asset_form_response(request, form, asset, 'edit')
    return render(request, 'catalog/studio_form.html', _studio_ctx(form, asset, 'edit'))


@creator_required
@require_POST
def studio_archive(request, pk):
    asset = get_object_or_404(Asset, pk=pk)
    if asset.creator_id != request.user.id and not request.user.is_admin_role:
        raise PermissionDenied
    asset.status, asset.is_featured = Asset.STATUS_ARCHIVED, False
    asset.save(update_fields=['status', 'is_featured', 'updated_at'])
    messages.success(request, f'“{asset.title}” was archived. Buyers who already own it keep access.')
    return redirect('catalog:studio_assets')
