from pathlib import Path

from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.core.paginator import Paginator
from django.db.models import F, Sum
from django.http import FileResponse, Http404, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.http import require_POST

from catalog.models import Asset, Category
from core import pdf

from . import services
from .models import CartItem, Order, Purchase

IS_AJAX = lambda request: request.headers.get('x-requested-with') == 'XMLHttpRequest'  # noqa: E731


def _back(request, default='commerce:cart'):
    nxt = request.POST.get('next', '')
    return redirect(nxt if nxt.startswith('/') and not nxt.startswith('//') else reverse(default))


# ------------------------------------------------------------------------------ cart
@login_required
def cart(request):
    if request.GET.get('cancelled'):
        messages.info(request, 'Payment cancelled. Your cart is untouched.')
        return redirect('commerce:cart')
    items = list(CartItem.objects.filter(user=request.user, asset__status=Asset.STATUS_PUBLISHED)
                 .select_related('asset__creator', 'asset__category'))
    subtotal = sum(i.asset.price for i in items)
    creator_share = sum(i.asset.price - round(i.asset.price * settings.PLATFORM_FEE_PERCENT / 100) for i in items)
    return render(request, 'commerce/cart.html', {'items': items, 'subtotal': subtotal, 'creator_share': creator_share})


@login_required
@require_POST
def cart_add(request, slug):
    asset = get_object_or_404(Asset.objects.select_related('creator'), slug=slug)
    try:
        added = services.add_to_cart(request.user, asset)
    except services.CartError as exc:
        if IS_AJAX(request):
            return JsonResponse({'ok': False, 'message': str(exc)}, status=400)
        messages.error(request, str(exc))
        return _back(request, default='catalog:explore') if request.POST.get('next') else redirect(asset.get_absolute_url())
    count = request.user.cart_items.count()
    message = 'Added to cart' if added else 'Already in your cart'
    if IS_AJAX(request):
        return JsonResponse({'ok': True, 'in_cart': True, 'cart_count': count, 'message': message, 'cart_url': reverse('commerce:cart')})
    messages.success(request, message)
    return redirect('commerce:cart')


@login_required
@require_POST
def cart_remove(request, slug):
    CartItem.objects.filter(user=request.user, asset__slug=slug).delete()
    count = request.user.cart_items.count()
    if IS_AJAX(request):
        return JsonResponse({'ok': True, 'cart_count': count, 'message': 'Removed from cart', 'reload': count == 0})
    messages.success(request, 'Removed from cart.')
    return redirect('commerce:cart')


@login_required
@require_POST
def cart_clear(request):
    n, _ = CartItem.objects.filter(user=request.user).delete()
    messages.success(request, 'Cart cleared.' if n else 'Your cart was already empty.')
    return redirect('commerce:cart')


# ------------------------------------------------------------------------------ checkout
@login_required
@require_POST
def checkout(request):
    """Create an order from one asset (Buy now) or the whole cart, then go to the PixelPay page."""
    slug = request.POST.get('asset')
    if slug:
        assets = [get_object_or_404(Asset, slug=slug)]
    else:
        assets = [i.asset for i in CartItem.objects.filter(user=request.user).select_related('asset__creator')]
    try:
        order = services.create_order(request.user, assets)
    except services.CartError as exc:
        messages.error(request, str(exc))
        return redirect('commerce:cart')
    return redirect('commerce:pay', reference=order.reference)


def _own_order(request, reference):
    order = get_object_or_404(Order.objects.prefetch_related('items__asset'), reference=reference)
    if order.user_id != request.user.id and not request.user.is_admin_role:
        raise PermissionDenied
    return order


@login_required
def pay(request, reference):
    """The simulated PixelPay sheet. Clearly labelled demo mode; no gateway, keys or SDK."""
    order = _own_order(request, reference)
    if order.is_paid:
        return redirect('commerce:success', reference=order.reference)
    return render(request, 'commerce/pay.html', {'order': order, 'items': order.items.select_related('asset')})


@login_required
@require_POST
def pay_confirm(request, reference):
    """Pay or Simulate failure. Safe to post twice: a paid order is never processed again."""
    order = _own_order(request, reference)
    result = services.confirm_payment(order, request.POST.get('outcome', 'success'))
    if result == 'paid':
        messages.success(request, 'Payment successful. Your assets are ready.')
        return redirect('commerce:success', reference=order.reference)
    if result == 'already_paid':
        messages.info(request, 'This order was already paid. Nothing was charged twice.')
        return redirect('commerce:success', reference=order.reference)
    messages.error(request, 'Your bank declined this payment. Nothing was charged and your cart is untouched.')
    return redirect('commerce:pay', reference=order.reference)


@login_required
def success(request, reference):
    order = _own_order(request, reference)
    if not order.is_paid:
        return redirect('commerce:pay', reference=order.reference)
    return render(request, 'commerce/success.html', {'order': order, 'items': order.items.select_related('asset')})


@login_required
@require_POST
def claim(request, slug):
    asset = get_object_or_404(Asset, slug=slug)
    try:
        created = services.claim_free(request.user, asset)
    except services.CartError as exc:
        messages.error(request, str(exc))
        return redirect(asset.get_absolute_url())
    messages.success(request, 'It’s yours! Added to your library.' if created else 'You already own this.')
    return redirect('commerce:library') if created else redirect(asset.get_absolute_url())


# ------------------------------------------------------------------------------ library + downloads
@login_required
def library(request):
    q = request.GET.get('q', '').strip()
    cat = request.GET.get('category', '')
    view = 'list' if request.GET.get('view') == 'list' else 'grid'
    qs = Purchase.objects.filter(user=request.user).select_related('asset__creator', 'asset__category').prefetch_related('asset__previews')
    if q:
        qs = qs.filter(asset__title__icontains=q)
    if cat:
        qs = qs.filter(asset__category__key=cat)
    page_obj = Paginator(qs, 24).get_page(request.GET.get('page'))
    total = Purchase.objects.filter(user=request.user).count()
    return render(request, 'commerce/library.html', {
        'page_obj': page_obj, 'purchases': page_obj.object_list, 'q': q, 'cat': cat, 'view': view, 'total': total,
        'categories': Category.objects.all(), 'filtered': bool(q or cat),
    })


@login_required
def download(request, slug):
    """Permission-checked download. The file lives in PRIVATE_FILES_ROOT, which no URL serves."""
    asset = get_object_or_404(Asset, slug=slug)
    user = request.user
    purchase = Purchase.objects.filter(user=user, asset=asset).first()
    if not (purchase or asset.creator_id == user.id or user.is_admin_role):
        raise PermissionDenied
    root = Path(asset.file.storage.location).resolve()
    path = (root / asset.file.name).resolve()
    if root not in path.parents or not path.is_file():
        raise Http404('File not found')
    if purchase:  # only real buyers move the counters
        Purchase.objects.filter(pk=purchase.pk).update(download_count=F('download_count') + 1, last_downloaded_at=timezone.now())
        Asset.objects.filter(pk=asset.pk).update(downloads=F('downloads') + 1)
    return FileResponse(open(path, 'rb'), as_attachment=True, filename=f'{asset.slug}.{asset.file_ext or "bin"}')


@login_required
def receipt_pdf(request, reference):
    order = _own_order(request, reference)
    if not order.is_paid:
        raise Http404('Receipt is only available for paid orders')
    paid = timezone.localtime(order.paid_at).strftime('%d %b %Y, %I:%M %p')
    rows = [[i.title, pdf.rupees(i.price)] for i in order.items.all()]
    flow = [
        pdf.table(['Item', 'Price'], rows, [135 * pdf.mm, 39 * pdf.mm], right_cols=(1,)),
        pdf.Spacer(1, 10),
        pdf.table(['Summary', 'Amount'], [['Subtotal', pdf.rupees(order.subtotal)], ['Platform fee (paid from the creator share)', pdf.rupees(order.platform_fee)], ['Total paid', pdf.rupees(order.total)]], [135 * pdf.mm, 39 * pdf.mm], right_cols=(1,)),
        pdf.Spacer(1, 16),
        pdf.Paragraph('Demo transaction: this is a lab project. Payments are simulated and no real money was charged.', pdf.STYLES['note']),
    ]
    data = pdf.build_pdf('Order receipt', [f'Order reference: <b>{order.reference}</b>', f'Date: {paid}', f'Billed to: {order.user.display_name} (@{order.user.username})', f'Status: {order.get_status_display()}'], flow)
    response = HttpResponse(data, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="receipt-{order.reference}.pdf"'
    return response
