import random
from urllib.parse import urlencode

from django import template
from django.utils.html import format_html

register = template.Library()


@register.filter
def inr(value):
    """1299 -> ₹1,299 (Indian digit grouping), 0 -> Free."""
    try:
        n = int(value)
    except (TypeError, ValueError):
        return ''
    if n == 0:
        return 'Free'
    s = str(abs(n))
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:])
            head = head[:-2]
        if head:
            parts.insert(0, head)
        s = ','.join(parts + [tail])
    return f'₹{s}'


@register.filter
def num(value):
    """Indian grouping without the rupee sign (for counters)."""
    return inr(value).replace('₹', '') if value else '0'


@register.filter
def in_set(value, container):
    try:
        return value in container
    except TypeError:
        return False


@register.filter
def filesize(num_bytes):
    try:
        size = float(num_bytes)
    except (TypeError, ValueError):
        return ''
    for unit in ('B', 'KB', 'MB', 'GB'):
        if size < 1024 or unit == 'GB':
            return f'{size:.0f} {unit}' if unit == 'B' or size >= 100 else f'{size:.1f} {unit}'
        size /= 1024


@register.filter
def duration(seconds):
    try:
        s = int(round(float(seconds)))
    except (TypeError, ValueError):
        return ''
    return f'{s // 60}:{s % 60:02d}'


@register.filter
def round_int(value):
    try:
        return int(round(float(value or 0)))
    except (TypeError, ValueError):
        return 0


@register.filter
def pct(value, total):
    try:
        return round(float(value) / float(total) * 100) if float(total) else 0
    except (TypeError, ValueError, ZeroDivisionError):
        return 0


@register.filter
def split(value, sep=','):
    return [p.strip() for p in str(value).split(sep) if p.strip()]


@register.filter
def wave_bars(seed, count=32):
    """Deterministic waveform-looking bar heights (percent) for an asset card."""
    rng = random.Random(f'wave:{seed}')
    v, out = 0.5, []
    for i in range(int(count)):
        v = min(1.0, max(0.12, v + (rng.random() - 0.5) * 0.55))
        env = 0.55 + 0.45 * __import__('math').sin(i / count * 3.14159)
        out.append(round(max(0.12, v * env) * 100))
    return out


@register.filter
def get_item(mapping, key):
    try:
        return mapping.get(key)
    except AttributeError:
        return None


@register.simple_tag(takes_context=True)
def qs(context, **kwargs):
    """Current query string with some keys replaced (None/'' removes them). Used by pagination and sort links."""
    params = context['request'].GET.copy()
    for key, value in kwargs.items():
        if value is None or value == '':
            params.pop(key, None)
        else:
            params[key] = value
    return '?' + urlencode(params, doseq=True) if params else '?'


@register.simple_tag
def star_svg(on):
    fill = 'currentColor' if on else 'none'
    return format_html(
        '<svg viewBox="0 0 24 24" fill="{}" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">'
        '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
        fill,
    )


@register.filter
def star(index, value):
    """{{ forloop.counter|star:rating }} -> filled star if index <= rating (rounded)."""
    return star_svg(int(index) <= round_int(value))
