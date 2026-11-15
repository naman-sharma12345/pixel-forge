from django.contrib import messages
from django.contrib.auth import login, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.contrib.auth.views import LoginView
from django.db.models import Avg, Count, Sum
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.http import require_POST

from catalog.models import Asset
from commerce.models import Order

from .forms import LoginForm, ProfileForm, RegisterForm, StyledPasswordChangeForm
from .models import CreatorProfile, User


def _safe_next(request, default='core:home'):
    nxt = request.POST.get('next') or request.GET.get('next') or ''
    if nxt and url_has_allowed_host_and_scheme(nxt, allowed_hosts={request.get_host()}, require_https=request.is_secure()):
        return nxt
    return reverse(default)


class PixelLoginView(LoginView):
    """Django's own LoginView with our template, an email-or-username form and a welcome message."""
    template_name = 'accounts/login.html'
    authentication_form = LoginForm
    redirect_authenticated_user = True

    def form_valid(self, form):
        response = super().form_valid(form)
        messages.success(self.request, f'Welcome back, {form.get_user().display_name.split()[0]}.')
        return response


def register(request):
    if request.user.is_authenticated:
        return redirect(_safe_next(request))
    sell = request.GET.get('intent') == 'sell'
    form = RegisterForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        user = form.save()
        login(request, user)
        messages.success(request, f'Welcome to the forge, {user.display_name.split()[0]}!')
        if sell or request.POST.get('intent') == 'sell':
            return redirect(f'{reverse("core:home")}?become=1')
        return redirect(_safe_next(request))
    elif request.method == 'POST':
        messages.error(request, 'Please fix the highlighted fields.')
    return render(request, 'accounts/register.html', {'form': form, 'sell': sell, 'next': request.GET.get('next', '')})


@login_required
def settings_view(request):
    tab = request.GET.get('tab', 'profile')
    if tab not in ('profile', 'security', 'orders'):
        tab = 'profile'
    profile_form = ProfileForm(instance=request.user)
    password_form = StyledPasswordChangeForm(request.user)
    if request.method == 'POST':
        which = request.POST.get('form_name')
        if which == 'password':
            tab = 'security'
            password_form = StyledPasswordChangeForm(request.user, request.POST)
            if password_form.is_valid():
                user = password_form.save()
                update_session_auth_hash(request, user)  # stay signed in on this device
                messages.success(request, 'Password updated.')
                return redirect(f'{reverse("accounts:settings")}?tab=security')
            messages.error(request, 'Could not change your password. Check the errors below.')
        else:
            tab = 'profile'
            profile_form = ProfileForm(request.POST, request.FILES, instance=request.user)
            if profile_form.is_valid():
                profile_form.save()
                messages.success(request, 'Profile saved.')
                return redirect('accounts:settings')
            messages.error(request, 'Could not save your profile. Check the errors below.')
    orders = request.user.orders.prefetch_related('items').order_by('-created_at') if tab == 'orders' else []
    return render(request, 'accounts/settings.html', {'tab': tab, 'profile_form': profile_form, 'password_form': password_form, 'orders': orders})


@login_required
@require_POST
def become_creator(request):
    user = request.user
    if user.role == User.ROLE_BUYER:
        user.role = User.ROLE_CREATOR
        user.save(update_fields=['role'])
        messages.success(request, 'Welcome to the forge. Your creator studio is ready.')
    CreatorProfile.objects.get_or_create(user=user)
    return redirect('dashboard:studio')


def profile(request, username):
    owner = get_object_or_404(User, username__iexact=username, is_active=True)
    assets = Asset.objects.published().filter(creator=owner)
    stats = assets.aggregate(
        asset_count=Count('id', distinct=True),
        sales=Count('purchases', distinct=True),
        downloads=Sum('downloads'),
    )
    stats['avg_rating'] = assets.aggregate(a=Avg('reviews__rating'))['a'] or 0
    sort = request.GET.get('sort', 'newest')
    ordering = {'newest': '-created_at', 'popular': '-n_sales', 'top-rated': '-avg_rating', 'price-asc': 'price', 'price-desc': '-price'}.get(sort, '-created_at')
    cards = assets.for_cards().order_by(ordering, '-created_at')
    return render(request, 'accounts/profile.html', {
        'owner': owner, 'assets': cards, 'stats': stats, 'sort': sort, 'tab': request.GET.get('tab', 'assets'),
        'sort_options': [('newest', 'Newest'), ('popular', 'Popular'), ('top-rated', 'Top rated'), ('price-asc', 'Price: low to high'), ('price-desc', 'Price: high to low')],
    })


@login_required
def wishlist(request):
    assets = list(request.user.wishlist.filter(status=Asset.STATUS_PUBLISHED).for_cards())
    total = sum(a.price for a in assets)
    return render(request, 'accounts/wishlist.html', {'assets': assets, 'total': total})


@login_required
@require_POST
def wishlist_toggle(request, slug):
    asset = get_object_or_404(Asset.objects.published(), slug=slug)
    if request.user.wishlist.filter(pk=asset.pk).exists():
        request.user.wishlist.remove(asset)
        on, message = False, 'Removed from wishlist'
    else:
        request.user.wishlist.add(asset)
        on, message = True, 'Saved to wishlist'
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({'ok': True, 'in_wishlist': on, 'message': message, 'count': request.user.wishlist.count()})
    messages.success(request, message)
    return redirect(_safe_next(request, default='accounts:wishlist') if request.POST.get('next') else asset.get_absolute_url())
