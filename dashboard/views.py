import csv

from django.contrib import messages
from django.core.paginator import Paginator
from django.db.models import Count, F, Q, Sum
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from accounts.decorators import admin_required, creator_required
from accounts.models import User
from catalog.models import Asset
from commerce.models import Order, OrderItem
from core import pdf

from . import services
from .forms import DateRangeForm, RejectForm, RoleForm, UserFilterForm


PALETTE = ['#8B5CF6', '#22D3EE', '#A3E635', '#F472B6', '#FBBF24', '#FB7185', '#C4B5FD', '#67E8F9', '#BEF264', '#F9A8D4']


def _csv_response(filename):
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    response.write('﻿')  # BOM so Excel opens UTF-8 correctly
    return response


def _pdf_response(data, filename):
    response = HttpResponse(data, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="{filename}"'
    return response


# ============================================================================ creator
@creator_required
def studio_overview(request):
    range_key = request.GET.get('range', '30d')
    if range_key not in services.RANGES:
        range_key = '30d'
    stats = services.creator_stats(request.user, range_key)
    recent = services.sales_queryset(request.user)[:8]
    top_max = max([t['revenue'] for t in stats['top_assets']] or [1])
    top_total = sum(t['revenue'] for t in stats['top_assets']) or 1
    for t in stats['top_assets']:
        t['bar'] = round(t['revenue'] / top_max * 100)
        t['share'] = round(t['revenue'] / top_total * 100)
    chart = {
        'labels': [p['date'] for p in stats['series']],
        'revenue': [p['revenue'] for p in stats['series']],
        'sales': [p['sales'] for p in stats['series']],
        'categories': [{'name': c['asset__category__name'], 'key': c['asset__category__key'], 'revenue': c['revenue'], 'sales': c['sales'], 'color': PALETTE[n % len(PALETTE)]}
                       for n, c in enumerate(stats['by_category'])],
    }
    return render(request, 'dashboard/studio.html', {
        'dash': 'studio', 'stats': stats, 'totals': stats['totals'], 'range': range_key, 'ranges': [('7d', '7 days'), ('30d', '30 days'), ('90d', '90 days')],
        'recent': recent, 'chart': chart, 'is_new': stats['totals']['assets'] == 0,
    })


@creator_required
def studio_sales(request):
    form = DateRangeForm(request.GET or None)
    data = form.cleaned_data if form.is_valid() else {}
    qs = services.sales_queryset(request.user, data.get('start'), data.get('end'))
    page_obj = Paginator(qs, 20).get_page(request.GET.get('page'))
    page_total = sum(i.creator_earning for i in page_obj.object_list)
    return render(request, 'dashboard/studio_sales.html', {'dash': 'studio', 'form': form, 'page_obj': page_obj, 'sales': page_obj.object_list, 'page_total': page_total,
                                                           'total': page_obj.paginator.count})


@creator_required
def sales_csv(request):
    form = DateRangeForm(request.GET or None)
    data = form.cleaned_data if form.is_valid() else {}
    response = _csv_response('pixel-forge-sales.csv')
    writer = csv.writer(response)
    writer.writerow(['Order', 'Paid at', 'Asset', 'Buyer', 'Price (INR)', 'Your earning (INR)'])
    for i in services.sales_queryset(request.user, data.get('start'), data.get('end')):
        writer.writerow([i.order.reference, timezone.localtime(i.order.paid_at).strftime('%Y-%m-%d %H:%M'), i.title, i.order.user.username, i.price, i.creator_earning])
    return response


@creator_required
def sales_pdf(request):
    form = DateRangeForm(request.GET or None)
    data = form.cleaned_data if form.is_valid() else {}
    items = list(services.sales_queryset(request.user, data.get('start'), data.get('end')))
    revenue, gross = sum(i.creator_earning for i in items), sum(i.price for i in items)
    period = f'{data.get("start") or "the beginning"} to {data.get("end") or "today"}'
    rows = [[timezone.localtime(i.order.paid_at).strftime('%d %b %Y'), i.title, '@' + i.order.user.username, pdf.rupees(i.price), pdf.rupees(i.creator_earning)] for i in items[:400]]
    flow = [
        pdf.table(['Date', 'Asset', 'Buyer', 'Price', 'Earned'], rows or [['–', 'No sales in this period', '', '', '']], [24 * pdf.mm, 68 * pdf.mm, 30 * pdf.mm, 26 * pdf.mm, 26 * pdf.mm], right_cols=(3, 4)),
        pdf.Spacer(1, 10),
        pdf.table(['Summary', ''], [['Sales', str(len(items))], ['Gross sales', pdf.rupees(gross)], ['Platform fees', pdf.rupees(gross - revenue)], ['Your earnings', pdf.rupees(revenue)]], [100 * pdf.mm, 74 * pdf.mm], right_cols=(1,)),
    ]
    data_bytes = pdf.build_pdf('Creator sales report', [f'Creator: {request.user.display_name} (@{request.user.username})', f'Period: {period}',
                                                           f'Generated: {timezone.localtime().strftime("%d %b %Y, %I:%M %p")}'], flow, footer='Pixel Forge · Sales report · Demo data')
    return _pdf_response(data_bytes, 'pixel-forge-sales-report.pdf')


# ============================================================================ admin
@admin_required
def admin_overview(request):
    stats = services.admin_stats()
    chart = {'labels': [p['date'] for p in stats['signups']], 'signups': [p['count'] for p in stats['signups']], 'revenue': [p['revenue'] for p in stats['revenue_series']]}
    queue = Asset.objects.select_related('creator', 'category').order_by('-created_at')[:6]
    users = User.objects.order_by('-date_joined')[:6]
    return render(request, 'dashboard/admin.html', {'dash': 'admin', 'stats': stats, 'chart': chart, 'queue': queue, 'users': users,
                                                    'signups_30': sum(chart['signups']), 'revenue_30': sum(chart['revenue'])})


@admin_required
def admin_users(request):
    form = UserFilterForm(request.GET or None)
    data = form.cleaned_data if form.is_valid() else {}
    qs = User.objects.annotate(n_assets=Count('assets', distinct=True)).order_by('-date_joined')
    if data.get('q'):
        q = data['q']
        qs = qs.filter(Q(username__icontains=q) | Q(first_name__icontains=q) | Q(email__icontains=q))
    if data.get('role'):
        qs = qs.filter(role=data['role'])
    if data.get('banned') == 'true':
        qs = qs.filter(is_active=False)
    elif data.get('banned') == 'false':
        qs = qs.filter(is_active=True)
    page_obj = Paginator(qs, 20).get_page(request.GET.get('page'))
    return render(request, 'dashboard/admin_users.html', {'dash': 'admin', 'form': form, 'page_obj': page_obj, 'users': page_obj.object_list, 'total': page_obj.paginator.count,
                                                          'roles': User.ROLE_CHOICES})


@admin_required
@require_POST
def admin_ban(request, pk):
    target = get_object_or_404(User, pk=pk)
    if target.pk == request.user.pk:
        messages.error(request, 'You cannot ban your own account.')
    else:
        ban = request.POST.get('ban') == '1'
        target.is_active = not ban
        target.save(update_fields=['is_active'])
        if ban:
            services.sign_out_everywhere(target)
        messages.success(request, f'@{target.username} is banned and signed out everywhere.' if ban else f'@{target.username} can sign in again.')
    return redirect(request.POST.get('next') or 'dashboard:admin_users')


@admin_required
@require_POST
def admin_role(request, pk):
    target = get_object_or_404(User, pk=pk)
    form = RoleForm(request.POST)
    if target.pk == request.user.pk:
        messages.error(request, 'You cannot change your own role.')
    elif form.is_valid():
        target.role = form.cleaned_data['role']
        target.save(update_fields=['role'])
        messages.success(request, f'@{target.username} is now {target.get_role_display().lower()}.')
    else:
        messages.error(request, 'Pick a valid role.')
    return redirect(request.POST.get('next') or 'dashboard:admin_users')


@admin_required
def admin_assets(request):
    status = request.GET.get('status', '')
    q = request.GET.get('q', '').strip()
    counts = {r['status']: r['n'] for r in Asset.objects.values('status').annotate(n=Count('id'))}
    qs = Asset.objects.select_related('creator', 'category').search(q).order_by('-created_at')
    if status in dict(Asset.STATUS_CHOICES):
        qs = qs.filter(status=status)
    page_obj = Paginator(qs, 20).get_page(request.GET.get('page'))
    tabs = [('', 'All', sum(counts.values()))] + [(k, label, counts.get(k, 0)) for k, label in Asset.STATUS_CHOICES]
    return render(request, 'dashboard/admin_assets.html', {'dash': 'admin', 'page_obj': page_obj, 'assets': page_obj.object_list, 'tabs': tabs, 'status': status, 'q': q,
                                                           'reject_form': RejectForm(), 'presets': ['Thumbnail doesn’t match the content', 'Possible copyright issue', 'Files are missing or broken', 'Description is misleading']})


@admin_required
@require_POST
def admin_moderate(request, pk):
    asset = get_object_or_404(Asset, pk=pk)
    action = request.POST.get('action')
    if action == 'publish':
        asset.status, asset.rejection_reason = Asset.STATUS_PUBLISHED, ''
        msg = f'“{asset.title}” approved and published.'
    elif action == 'reject':
        form = RejectForm({'reason': request.POST.get('reason', '')})
        if not form.is_valid():
            messages.error(request, form.errors['reason'][0])
            return redirect(request.POST.get('next') or 'dashboard:admin_assets')
        asset.status, asset.rejection_reason, asset.is_featured = Asset.STATUS_REJECTED, form.cleaned_data['reason'], False
        msg = f'“{asset.title}” rejected.'
    elif action == 'archive':
        asset.status, asset.is_featured = Asset.STATUS_ARCHIVED, False
        msg = f'“{asset.title}” archived.'
    elif action in ('feature', 'unfeature'):
        if action == 'feature' and asset.status != Asset.STATUS_PUBLISHED:
            messages.error(request, 'Only published assets can be featured.')
            return redirect(request.POST.get('next') or 'dashboard:admin_assets')
        asset.is_featured = action == 'feature'
        msg = f'“{asset.title}” is {"now featured" if asset.is_featured else "no longer featured"}.'
    else:
        messages.error(request, 'Unknown action.')
        return redirect('dashboard:admin_assets')
    asset.save()
    messages.success(request, msg)
    nxt = request.POST.get('next', '')
    return redirect(nxt if nxt.startswith('/') and not nxt.startswith('//') else 'dashboard:admin_assets')


@admin_required
def orders_csv(request):
    form = DateRangeForm(request.GET or None)
    data = form.cleaned_data if form.is_valid() else {}
    qs = Order.objects.filter(status=Order.STATUS_PAID).select_related('user').prefetch_related('items').order_by('-paid_at')
    if data.get('start'):
        qs = qs.filter(paid_at__date__gte=data['start'])
    if data.get('end'):
        qs = qs.filter(paid_at__date__lte=data['end'])
    response = _csv_response('pixel-forge-orders.csv')
    writer = csv.writer(response)
    writer.writerow(['Reference', 'Paid at', 'Buyer', 'Items', 'Total (INR)', 'Platform fee (INR)'])
    for o in qs:
        writer.writerow([o.reference, timezone.localtime(o.paid_at).strftime('%Y-%m-%d %H:%M'), o.user.username, '; '.join(i.title for i in o.items.all()), o.total, o.platform_fee])
    return response


@admin_required
def summary_pdf(request):
    first, last = services.month_bounds(request.GET.get('month', ''))
    paid = Order.objects.filter(status=Order.STATUS_PAID, paid_at__date__gte=first, paid_at__date__lte=last)
    sums = paid.aggregate(revenue=Sum('total'), fees=Sum('platform_fee'), n=Count('id'))
    new_users = User.objects.filter(date_joined__date__gte=first, date_joined__date__lte=last).count()
    items = OrderItem.objects.filter(order__in=paid)
    creators = list(items.values('creator__username').annotate(earned=Sum('creator_earning'), sales=Count('id')).order_by('-earned')[:8])
    assets = list(items.values('title').annotate(revenue=Sum('price'), sales=Count('id')).order_by('-revenue')[:8])
    flow = [
        pdf.table(['Metric', 'Value'], [['Paid orders', str(sums['n'] or 0)], ['Gross revenue', pdf.rupees(sums['revenue'] or 0)], ['Platform fees', pdf.rupees(sums['fees'] or 0)], ['New users', str(new_users)]], [100 * pdf.mm, 74 * pdf.mm], right_cols=(1,)),
        pdf.Spacer(1, 12), pdf.Paragraph('<b>Top creators</b>', pdf.STYLES['body']), pdf.Spacer(1, 4),
        pdf.table(['Creator', 'Sales', 'Earned'], [['@' + c['creator__username'], str(c['sales']), pdf.rupees(c['earned'])] for c in creators] or [['–', '0', '']], [100 * pdf.mm, 30 * pdf.mm, 44 * pdf.mm], right_cols=(1, 2)),
        pdf.Spacer(1, 12), pdf.Paragraph('<b>Top assets</b>', pdf.STYLES['body']), pdf.Spacer(1, 4),
        pdf.table(['Asset', 'Sales', 'Revenue'], [[a['title'], str(a['sales']), pdf.rupees(a['revenue'])] for a in assets] or [['–', '0', '']], [100 * pdf.mm, 30 * pdf.mm, 44 * pdf.mm], right_cols=(1, 2)),
    ]
    data_bytes = pdf.build_pdf('Monthly summary', [f'Period: {first.strftime("%B %Y")}', f'Generated: {timezone.localtime().strftime("%d %b %Y, %I:%M %p")}'], flow, footer='Pixel Forge · Admin monthly summary · Demo data')
    return _pdf_response(data_bytes, f'pixel-forge-summary-{first:%Y-%m}.pdf')
