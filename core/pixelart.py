"""Procedural pixel-art engine (Pillow), a Python port of the legacy lib/pixelArt.ts.

Everything is drawn at a small logical resolution and upscaled with nearest-neighbour,
so it stays crisp. All output is deterministic per seed.
"""
import io
import math
import random

from PIL import Image, ImageDraw

OUT = '#0b0a14'
WHITE = '#f7f5ff'

RAMPS = {
    'violet': ('#2e1a5e', '#5b34c4', '#8b5cf6', '#c9b8ff'),
    'cyan': ('#0c3b4f', '#0e7c99', '#22d3ee', '#b6f6ff'),
    'pink': ('#4d1238', '#a8306f', '#f472b6', '#fdd5ea'),
    'lime': ('#203d0c', '#4f8a12', '#a3e635', '#e8fcc2'),
    'amber': ('#4f2c06', '#b85e0a', '#fbbf24', '#fff0b8'),
    'rose': ('#4f0e20', '#c0284b', '#fb7185', '#ffe0e5'),
    'steel': ('#22223a', '#45456a', '#8585a8', '#d4d4ea'),
    'wood': ('#2e1a0e', '#5c3317', '#8f5a2b', '#c48a4f'),
    'leaf': ('#0f2e1a', '#1e6b3a', '#3fae5a', '#9be38a'),
    'stone': ('#1c1c2a', '#3a3a52', '#5e5e7c', '#9494b4'),
}
BRIGHT = ['violet', 'cyan', 'pink', 'lime', 'amber', 'rose']
SKINS = [
    ('#5a3420', '#9a5b3a', '#d08a5c', '#f1c09a'),
    ('#3b2416', '#6b4128', '#a36a43', '#d3a079'),
    ('#6b4a3a', '#c08a6a', '#f0c4a0', '#ffe4cc'),
    ('#2a1a12', '#4f3020', '#7a4c30', '#a8744c'),
]
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]

FONT_SRC = {
    'A': '010 101 111 101 101', 'B': '110 101 110 101 110', 'C': '011 100 100 100 011', 'D': '110 101 101 101 110',
    'E': '111 100 110 100 111', 'F': '111 100 110 100 100', 'G': '011 100 101 101 011', 'H': '101 101 111 101 101',
    'I': '111 010 010 010 111', 'J': '001 001 001 101 010', 'K': '101 101 110 101 101', 'L': '100 100 100 100 111',
    'M': '101 111 111 101 101', 'N': '110 101 101 101 101', 'O': '010 101 101 101 010', 'P': '110 101 110 100 100',
    'Q': '010 101 101 110 011', 'R': '110 101 110 101 101', 'S': '011 100 010 001 110', 'T': '111 010 010 010 010',
    'U': '101 101 101 101 111', 'V': '101 101 101 101 010', 'W': '101 101 111 111 101', 'X': '101 101 010 101 101',
    'Y': '101 101 010 010 010', 'Z': '111 001 010 100 111',
    '0': '111 101 101 101 111', '1': '010 110 010 010 111', '2': '110 001 010 100 111', '3': '110 001 010 001 110',
    '4': '101 101 111 001 001', '5': '111 100 110 001 110', '6': '011 100 111 101 111', '7': '111 001 010 010 010',
    '8': '111 101 111 101 111', '9': '111 101 111 001 110',
    ' ': '000 000 000 000 000', '!': '010 010 010 000 010', '-': '000 000 111 000 000', '.': '000 000 000 000 010',
    '+': '000 010 111 010 000', ':': '000 010 000 010 000',
}
FONT = {k: v.split() for k, v in FONT_SRC.items()}


def rgb(c):
    if isinstance(c, tuple):
        return c[:3]
    c = c.lstrip('#')
    return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16))


def mix(a, b, t):
    ra, rb = rgb(a), rgb(b)
    return tuple(round(ra[i] + (rb[i] - ra[i]) * t) for i in range(3))


def make_rng(*parts):
    return random.Random('|'.join(str(p) for p in parts))


class Canvas:
    def __init__(self, w, h, bg=None):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w, h), (rgb(bg) + (255,)) if bg else (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    def px(self, x, y, c, a=1.0):
        x, y = int(x), int(y)
        if not (0 <= x < self.w and 0 <= y < self.h):
            return
        r, g, b = rgb(c)
        if a >= 1:
            self.im.putpixel((x, y), (r, g, b, 255))
            return
        R, G, B, A = self.im.getpixel((x, y))
        if A == 0:
            self.im.putpixel((x, y), (r, g, b, int(255 * a)))
        else:
            self.im.putpixel((x, y), (round(R * (1 - a) + r * a), round(G * (1 - a) + g * a), round(B * (1 - a) + b * a), 255))

    def rect(self, x, y, w, h, c, a=1.0):
        if a >= 1:
            self.d.rectangle([int(x), int(y), int(x + w - 1), int(y + h - 1)], fill=rgb(c) + (255,))
        else:
            for yy in range(int(y), int(y + h)):
                for xx in range(int(x), int(x + w)):
                    self.px(xx, yy, c, a)

    def gradient(self, x0, y0, w, h, colors):
        n = len(colors) - 1
        for y in range(h):
            t = y / max(1, h - 1) * n
            base = min(n, int(t))
            frac = (t - base) * 16
            for x in range(w):
                c = colors[base + 1] if base < n and frac > BAYER[y & 3][x & 3] else colors[base]
                self.px(x0 + x, y0 + y, c)

    def glow(self, cx, cy, r, c, strength=1.0):
        for y in range(int(cy - r), int(cy + r) + 1):
            for x in range(int(cx - r), int(cx + r) + 1):
                d = math.hypot(x - cx, y - cy) / r
                if d >= 1:
                    continue
                if (1 - d) * strength * 17 > BAYER[y & 3][x & 3]:
                    self.px(x, y, c)

    def disc(self, cx, cy, r, c):
        for y in range(int(cy - r), int(cy + r) + 1):
            for x in range(int(cx - r), int(cx + r) + 1):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                    self.px(x, y, c)

    def shadow(self, cx, cy, rx, ry):
        for y in range(int(cy - ry), int(cy + ry) + 1):
            for x in range(int(cx - rx), int(cx + rx) + 1):
                d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
                if d <= 1 and (d < 0.45 or (x + y) % 2 == 0):
                    self.px(x, y, '#000000', 0.55)

    def blit(self, sprite, x, y, scale=1):
        if scale > 1:
            sprite = sprite.resize((sprite.width * scale, sprite.height * scale), Image.NEAREST)
        self.im.paste(sprite, (int(x), int(y)), sprite)

    def text(self, s, x, y, color, scale=1, shadow=None):
        cx = x
        for ch in s.upper():
            glyph = FONT.get(ch, FONT[' '])
            for gy in range(5):
                for gx in range(3):
                    if glyph[gy][gx] != '1':
                        continue
                    col = color(gy) if callable(color) else color
                    if shadow:
                        self.rect(cx + gx * scale + scale, y + gy * scale + scale, scale, scale, shadow)
                    self.rect(cx + gx * scale, y + gy * scale, scale, scale, col)
            cx += 4 * scale
        return cx - x - scale

    def png(self, scale=1):
        im = self.im if scale == 1 else self.im.resize((self.w * scale, self.h * scale), Image.NEAREST)
        buf = io.BytesIO()
        im.save(buf, 'PNG', optimize=True)
        return buf.getvalue()


def outline(img, color=OUT):
    """Return a copy of img with a 1px dark outline around every shape."""
    w, h = img.size
    out = img.copy()
    src = img.load()
    dst = out.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3]:
                    dst[x, y] = rgb(color) + (255,)
                    break
    return out


def ramp_of(rng, names=BRIGHT):
    return RAMPS[rng.choice(names)]


def creature(rng, ramp=None):
    """Mirrored random monster with highlight, eyes and outline (18 x 16)."""
    ramp = ramp or ramp_of(rng)
    mask = ['........', '.....111', '....1122', '...11222', '...12222', '..112222', '..122222', '.1122222',
            '.1122222', '11122222', '.1112222', '..111122', '..1.11.1', '..1..1..']
    H = len(mask)
    im = Image.new('RGBA', (18, H + 2), (0, 0, 0, 0))
    for y in range(H):
        for x in range(8):
            ch = mask[y][x]
            if not (ch == '2' or (ch == '1' and rng.random() < 0.55)):
                continue
            lvl = 3 if y < H * 0.3 else 2 if y < H * 0.65 else 1
            im.putpixel((x + 1, y + 1), rgb(ramp[lvl]) + (255,))
            im.putpixel((16 - x, y + 1), rgb(ramp[max(0, lvl - 1)]) + (255,))
    im.putpixel((5, 4), rgb(ramp[3]) + (255,))
    im.putpixel((6, 4), rgb(WHITE) + (255,))
    ey, ex = 5 + rng.randint(0, 2), rng.randint(4, 6)
    for xx in (ex, 17 - ex):
        im.putpixel((xx, ey), rgb(WHITE) + (255,))
        im.putpixel((xx, ey + 1), rgb(OUT) + (255,))
    if rng.random() < 0.6:
        for x in range(7, 11):
            im.putpixel((x, ey + 3), rgb(OUT) + (255,))
    return outline(im)


def item_sprite(rng, kind=None):
    """Small item icons: heart, potion, gem, shield, star."""
    ramp = ramp_of(rng)
    kind = kind or rng.choice(['heart', 'potion', 'gem', 'shield', 'star'])
    c = Canvas(16, 16)
    R = lambda i: ramp[i]  # noqa: E731
    if kind == 'heart':
        for (x, y) in [(3, 3), (4, 3), (8, 3), (9, 3)]:
            c.rect(x - 1, y - 1, 3, 3, R(2))
        c.rect(2, 3, 11, 4, R(2)); c.rect(3, 7, 9, 2, R(2)); c.rect(4, 9, 7, 2, R(1)); c.rect(6, 11, 3, 2, R(1)); c.px(4, 4, WHITE)
    elif kind == 'potion':
        c.rect(6, 2, 4, 3, RAMPS['wood'][2]); c.rect(7, 5, 2, 2, RAMPS['steel'][3]); c.rect(4, 7, 8, 6, R(2)); c.rect(5, 6, 6, 1, RAMPS['steel'][3]); c.rect(4, 11, 8, 2, R(1)); c.px(5, 8, WHITE)
    elif kind == 'gem':
        c.rect(4, 3, 8, 2, R(3)); c.rect(2, 5, 12, 3, R(2)); c.rect(4, 8, 8, 2, R(1)); c.rect(6, 10, 4, 2, R(1)); c.px(5, 4, WHITE)
    elif kind == 'shield':
        c.rect(3, 2, 10, 7, R(2)); c.rect(4, 9, 8, 3, R(1)); c.rect(6, 12, 4, 2, R(1)); c.rect(7, 3, 2, 9, R(3)); c.rect(4, 5, 8, 2, R(3))
    else:
        c.rect(7, 1, 2, 4, R(3)); c.rect(1, 6, 14, 3, R(2)); c.rect(5, 9, 6, 3, R(2)); c.rect(3, 12, 3, 2, R(1)); c.rect(10, 12, 3, 2, R(1)); c.rect(5, 4, 6, 3, R(3))
    return outline(c.im)


def humanoid(rng, frame=0):
    skin = rng.choice(SKINS)
    hair = RAMPS[rng.choice(['wood', 'amber', 'steel', 'rose', 'violet', 'stone'])]
    cloth = ramp_of(rng)
    pants = RAMPS[rng.choice(['stone', 'wood', 'steel', 'violet'])]
    c = Canvas(18, 26)
    bob = frame % 2
    stride = 1 if frame % 4 == 1 else -1 if frame % 4 == 3 else 0
    c.rect(6, 17 + bob, 2, 4 - bob, pants[2]); c.rect(10, 17 + bob, 2, 4 - bob, pants[1])
    c.rect(5 + stride, 21, 3, 2, RAMPS['wood'][1]); c.rect(10 - stride, 21, 3, 2, RAMPS['wood'][0])
    o = bob
    c.rect(3, 11 + o, 2, 5, cloth[2]); c.rect(13, 11 + o, 2, 5, cloth[1])
    c.rect(3, 16 + o, 2, 1, skin[2]); c.rect(13, 16 + o, 2, 1, skin[1])
    c.rect(5, 11 + o, 8, 6, cloth[2]); c.rect(5, 11 + o, 1, 6, cloth[3]); c.rect(12, 11 + o, 1, 6, cloth[1])
    c.rect(5, 16 + o, 8, 1, RAMPS['wood'][1]); c.rect(8, 16 + o, 2, 1, RAMPS['amber'][3])
    c.rect(8, 10 + o, 2, 1, skin[1]); c.rect(5, 2 + o, 8, 8, skin[2]); c.rect(6, 3 + o, 2, 2, skin[3]); c.rect(12, 2 + o, 1, 8, skin[1])
    blink = frame % 6 == 5
    c.rect(7, 6 + o, 1, 1 if blink else 2, OUT); c.rect(10, 6 + o, 1, 1 if blink else 2, OUT)
    c.px(6, 8 + o, RAMPS['pink'][3]); c.px(11, 8 + o, RAMPS['pink'][2])
    style = rng.randint(0, 4)
    if style == 0:
        c.rect(5, 1 + o, 8, 3, hair[2]); c.rect(6, 1 + o, 3, 1, hair[3]); c.rect(5, 4 + o, 1, 2, hair[1]); c.rect(12, 4 + o, 1, 2, hair[1])
    elif style == 1:
        c.rect(5, 1 + o, 8, 3, hair[2]); c.rect(4, 3 + o, 2, 8, hair[2]); c.rect(12, 3 + o, 2, 8, hair[1])
    elif style == 2:
        c.rect(5, 2 + o, 8, 2, hair[2])
        for x in (5, 7, 9, 11):
            c.rect(x, o, 1, 2, hair[3 if x < 9 else 2])
    elif style == 3:
        c.rect(4, o, 10, 4, cloth[2]); c.rect(4, 4 + o, 1, 7, cloth[2]); c.rect(13, 4 + o, 1, 7, cloth[1]); c.rect(5, o, 4, 1, cloth[3])
    else:
        c.rect(4, 1 + o, 10, 4, RAMPS['steel'][2]); c.rect(5, 1 + o, 3, 1, RAMPS['steel'][3]); c.rect(8, max(0, o - 1), 2, 2, RAMPS['rose'][2])
    gear = rng.randint(0, 2)
    if gear == 1:
        c.rect(15, 5 + o, 1, 9, RAMPS['steel'][3]); c.rect(16, 5 + o, 1, 9, RAMPS['steel'][2]); c.rect(14, 14 + o, 4, 1, RAMPS['amber'][2])
    elif gear == 2:
        c.rect(15, 6 + o, 1, 17 - o, RAMPS['wood'][2]); c.rect(14, 3 + o, 3, 3, RAMPS['cyan'][2])
    return outline(c.im)


SKY_SETS = [
    (['#1b0f3b', '#4a1f6e', '#a8306f', '#f472b6', '#fbbf24'], ['#5b2a6e', '#3b1a52', '#24113a', '#140a24'], 'sun', '#fff0b8', False),
    (['#05050d', '#0d0b24', '#1f1450', '#3b2a80'], ['#2a2260', '#1c1744', '#120f2e', '#09081a'], 'moon', '#e8e4ff', True),
    (['#0b4a6b', '#0e7c99', '#22b8d8', '#7ee3f5', '#c9f6ff'], ['#5a8fb0', '#2f6b5a', '#1e4f3a', '#12301f'], 'sun', '#fffbe6', False),
    (['#071a12', '#0f3b2a', '#1e6b5a', '#3fae8a', '#a3e635'], ['#1f5a4a', '#16443a', '#0e2e28', '#071a16'], 'moon', '#e8fcc2', True),
]


def draw_landscape(c, rng, w, h):
    sky, layers, body, body_color, stars = rng.choice(SKY_SETS)
    c.gradient(0, 0, w, int(h * 0.78), sky)
    c.rect(0, int(h * 0.78), w, h, sky[-1])
    if stars:
        for _ in range(int(w * h / 60)):
            c.px(rng.randint(0, w - 1), rng.randint(0, int(h * 0.55)), WHITE, 0.35 + rng.random() * 0.65)
    bx, by, br = rng.randint(int(w * 0.15), int(w * 0.85)), int(h * (0.22 + rng.random() * 0.15)), max(4, int(h * 0.11))
    c.glow(bx, by, br * 3, body_color, 0.45)
    c.disc(bx, by, br, body_color)
    if body == 'moon':
        c.disc(bx + br * 0.45, by - br * 0.25, br * 0.8, sky[1])
    if not stars:
        for _ in range(3):
            cx, cy = rng.randint(0, w), rng.randint(4, int(h * 0.35))
            for i in range(5):
                c.disc(cx + i * 3 - 6, cy + i % 2, 2 + i % 3, WHITE)
    for li, col in enumerate(layers):
        base, amp = h * (0.5 + li * 0.11), h * (0.16 - li * 0.025)
        f1, f2, p1, p2 = 0.04 + rng.random() * 0.05, 0.11 + rng.random() * 0.08, rng.random() * 10, rng.random() * 10
        jag = li < 2
        for x in range(w):
            wave = abs(math.sin(x * f1 + p1)) if jag else 0.5 + 0.5 * math.sin(x * f1 + p1)
            top = round(base - amp * wave - amp * 0.35 * math.sin(x * f2 + p2))
            c.d.line([(x, top), (x, h)], fill=rgb(col) + (255,))
            if li == 0 and top < base - amp * 0.7:
                for y in range(top, top + 2):
                    c.px(x, y, mix(col, WHITE, 0.45))
        if li == 2:
            x = rng.randint(0, 4)
            while x < w:
                top = round(base - amp * 0.5 - amp * 0.35 * math.sin(x * f2 + p2)) - rng.randint(3, 7)
                for k in range(8):
                    for dx in range(-(k // 2), k // 2 + 1):
                        c.px(x + dx, top + k, layers[3])
                x += rng.randint(4, 9)


S = 96


def backdrop(c, tint):
    c.gradient(0, 0, c.w, c.h, ['#0b0b14', mix('#0f0f17', tint, 0.18), mix('#161622', tint, 0.3)])


def sparkle(c, x, y, col):
    c.px(x, y, WHITE)
    for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        c.px(x + dx, y + dy, col)


def scene_sprites(rng):
    c = Canvas(S, S)
    tint = ramp_of(rng)
    backdrop(c, tint[1])
    if rng.random() < 0.5:
        for i in range(4):
            cx, cy = (i % 2) * 48, (i // 2) * 48
            if (i + (1 if i > 1 else 0)) % 2 == 0:
                c.rect(cx, cy, 48, 48, '#ffffff', 0.025)
            g = creature(rng) if rng.random() < 0.55 else item_sprite(rng)
            c.shadow(cx + 24, cy + 40, 11, 3)
            c.blit(g, cx + 24 - g.width, cy + 40 - g.height * 2 + 2, 2)
        for _ in range(6):
            sparkle(c, rng.randint(4, 92), rng.randint(4, 92), tint[2])
    else:
        c.glow(48, 44, 40, tint[1], 0.6)
        c.rect(14, 80, 68, 4, RAMPS['stone'][2]); c.rect(14, 80, 68, 1, RAMPS['stone'][3]); c.rect(18, 84, 60, 4, RAMPS['stone'][1])
        g = creature(rng, tint)
        c.shadow(48, 80, 22, 3)
        c.blit(g, 48 - g.width * 2, 80 - g.height * 4 + 4, 4)
        for _ in range(8):
            sparkle(c, rng.randint(4, 92), rng.randint(4, 60), rng.choice([tint[3], RAMPS['amber'][3], WHITE]))
    return c


def scene_tileset(rng):
    c = Canvas(S, S)
    c.gradient(0, 0, S, S, rng.choice([['#0e2a4a', '#1b4f7a', '#3a86b5', '#8fd4ef'], ['#2a1350', '#5b34c4', '#a07ae8', '#e2d4ff'], ['#3b1430', '#a8306f', '#f08aa8', '#ffd9c7']]))
    for _ in range(3):
        cx, cy = rng.randint(6, 90), rng.randint(6, 30)
        for i in range(4):
            c.disc(cx + i * 3, cy + i % 2, 2 + i % 2, WHITE)
    grass = rng.choice([RAMPS['leaf'], RAMPS['lime'], RAMPS['cyan'], RAMPS['pink']])
    dirt = RAMPS['wood']
    ground, gh = [], rng.randint(8, 9)
    for _ in range(12):
        if rng.random() < 0.18:
            gh = max(7, min(10, gh + (-1 if rng.random() < 0.5 else 1)))
        ground.append(gh)
    pit = rng.randint(3, 7)

    def tile(tx, ty, kind):
        for y in range(8):
            for x in range(8):
                n = ((tx * 7 + x * 13 + y * 17 + ty * 3) * 2654435761 & 0xFFFFFFFF) >> 28
                if kind == 'water':
                    col = RAMPS['cyan'][3] if y == 0 else RAMPS['cyan'][2] if y < 3 else RAMPS['cyan'][1]
                elif kind == 'brick':
                    mortar = y % 4 == 3 or (x + (y // 4) * 4) % 8 == 7
                    col = RAMPS['stone'][0] if mortar else RAMPS['stone'][3] if y % 4 == 0 else RAMPS['stone'][2]
                else:
                    col = dirt[0] if n < 2 else dirt[3] if n > 13 else dirt[2]
                    if kind == 'grass':
                        edge = 2 + (1 if (x * 5 + tx) % 3 == 0 else 0)
                        if y < edge:
                            col = grass[3] if y == 0 else grass[2]
                        elif y == edge:
                            col = grass[1]
                c.px(tx * 8 + x, ty * 8 + y, col)

    for tx in range(12):
        is_pit = pit <= tx < pit + 2
        for ty in range(ground[tx], 12):
            if is_pit and ty <= ground[tx]:
                tile(tx, ty + 1, 'water')
            elif not is_pit:
                tile(tx, ty, 'grass' if ty == ground[tx] else 'dirt')
            elif ty > ground[tx] + 1:
                tile(tx, ty, 'dirt')
    px_, py_ = rng.randint(1, 7), rng.randint(3, 5)
    for i in range(3):
        tile(px_ + i, py_, 'brick')
        cx, cy = (px_ + i) * 8 + 4, (py_ - 1) * 8 + 3
        c.rect(cx - 1, cy - 2, 3, 5, RAMPS['amber'][2]); c.px(cx - 1, cy - 2, RAMPS['amber'][3])
    tt = 1 if pit > 5 else 9
    base = ground[tt] * 8
    c.rect(tt * 8 + 3, base - 8, 2, 8, RAMPS['wood'][1])
    c.disc(tt * 8 + 4, base - 12, 5, grass[1]); c.disc(tt * 8 + 3, base - 13, 3, grass[2])
    for i in range(0, S + 1, 8):
        for k in range(0, S, 2):
            c.px(i, k, WHITE, 0.07); c.px(k, i, WHITE, 0.07)
    return c


def scene_characters(rng):
    c = Canvas(S, S)
    tint = ramp_of(rng)
    backdrop(c, tint[1])
    c.glow(48, 40, 44, tint[1], 0.55)
    c.gradient(0, 84, S, 12, [RAMPS['stone'][1], RAMPS['stone'][0]])
    c.rect(0, 84, S, 1, RAMPS['stone'][2])
    a, b, hero = humanoid(rng), humanoid(rng), humanoid(rng)
    c.shadow(14, 86, 12, 2); c.shadow(82, 86, 12, 2)
    c.blit(a, -4, 86 - a.height * 2, 2); c.blit(b, 64, 86 - b.height * 2, 2)
    c.shadow(48, 88, 18, 3)
    c.blit(hero, int(48 - hero.width * 1.5), 89 - hero.height * 3, 3)
    return c


def bevel(c, x, y, w, h, ramp, fill):
    c.rect(x, y, w, h, OUT); c.rect(x + 1, y + 1, w - 2, h - 2, fill)
    c.rect(x + 1, y + 1, w - 2, 1, ramp[3]); c.rect(x + 1, y + 1, 1, h - 2, ramp[3])
    c.rect(x + 1, y + h - 2, w - 2, 1, ramp[0]); c.rect(x + w - 2, y + 1, 1, h - 2, ramp[0])


def scene_ui(rng):
    W = 128
    c = Canvas(W, W)
    acc = ramp_of(rng)
    c.gradient(0, 0, W, W, ['#0b0b14', acc[0], '#0b0b14'])
    bevel(c, 6, 6, 116, 116, RAMPS['steel'], '#161622')
    c.rect(8, 8, 112, 12, acc[1]); c.rect(8, 8, 112, 1, acc[3]); c.rect(8, 19, 112, 1, acc[0])
    c.text(rng.choice(['ITEMS', 'INVENTORY', 'PAUSED', 'SHOP', 'QUEST']), 12, 12, WHITE, 1, acc[0])
    bevel(c, 107, 10, 9, 8, RAMPS['rose'], RAMPS['rose'][2]); c.text('X', 110, 11, WHITE)

    def bar(y, label, rp, pct):
        c.text(label, 12, y + 1, rp[3]); c.rect(24, y, 92, 7, OUT); c.rect(25, y + 1, 90, 5, '#0b0b14')
        fw = round(90 * pct)
        c.rect(25, y + 1, fw, 5, rp[2]); c.rect(25, y + 1, fw, 1, rp[3]); c.rect(25, y + 5, fw, 1, rp[1])
    bar(26, 'HP', RAMPS['rose'], 0.55 + rng.random() * 0.4)
    bar(36, 'MP', RAMPS['cyan'], 0.3 + rng.random() * 0.6)
    for i in range(8):
        sx, sy = 12 + (i % 4) * 26, 48 + (i // 4) * 26
        bevel(c, sx, sy, 24, 24, RAMPS['stone'], acc[0] if i == 0 else '#101018')
        if rng.random() < 0.8:
            c.blit(item_sprite(rng), sx + 4, sy + 4)
    bevel(c, 12, 102, 50, 14, acc, acc[2]); c.text('USE', 12 + 19, 107, WHITE, 1, acc[0])
    bevel(c, 66, 102, 50, 14, RAMPS['steel'], RAMPS['steel'][1]); c.text('DROP', 66 + 17, 107, RAMPS['steel'][3])
    return c


def scene_background(rng):
    c = Canvas(S, S)
    draw_landscape(c, rng, S, S)
    return c


VFX_SETS = [
    [RAMPS['rose'][0], RAMPS['rose'][1], RAMPS['rose'][2], RAMPS['amber'][2], RAMPS['amber'][3], WHITE],
    [RAMPS['violet'][0], RAMPS['violet'][1], RAMPS['violet'][2], RAMPS['cyan'][2], RAMPS['cyan'][3], WHITE],
    [RAMPS['lime'][0], RAMPS['lime'][1], RAMPS['lime'][2], RAMPS['lime'][3], WHITE],
    [RAMPS['cyan'][0], RAMPS['cyan'][1], RAMPS['cyan'][2], RAMPS['steel'][3], WHITE],
]


def burst(c, cx, cy, R, cols, rng, k=7):
    ph = rng.random() * 6
    for y in range(int(cy - R * 1.3), int(cy + R * 1.3) + 1):
        for x in range(int(cx - R * 1.3), int(cx + R * 1.3) + 1):
            d = math.hypot(x - cx, y - cy)
            a = math.atan2(y - cy, x - cx)
            rr = R * (0.72 + 0.28 * math.sin(a * k + ph) + 0.12 * math.sin(a * (k + 4) - ph))
            v = 1 - d / rr if rr else 0
            if v <= 0:
                continue
            t = v * (len(cols) - 0.01) + (BAYER[y & 3][x & 3] / 16 - 0.5) * 0.9
            c.px(x, y, cols[max(0, min(len(cols) - 1, int(t)))])


def scene_vfx(rng):
    c = Canvas(S, S)
    cols = rng.choice(VFX_SETS)
    c.gradient(0, 0, S, S, ['#07070d', mix('#07070d', cols[1], 0.25), '#07070d'])
    c.glow(48, 38, 42, cols[1], 0.5)
    burst(c, 48, 38, 24, cols, rng, rng.randint(5, 9))
    for _ in range(26):
        a, d = rng.random() * math.tau, 26 + rng.random() * 16
        c.rect(48 + math.cos(a) * d, 38 + math.sin(a) * d * 0.9, 2 if rng.random() < 0.3 else 1, 2 if rng.random() < 0.3 else 1, rng.choice(cols[2:]))
    c.rect(0, 74, S, 22, '#000000', 0.45); c.rect(0, 74, S, 1, cols[1])
    for f in range(5):
        burst(c, 2 + f * 19 + 8, 85, 2 + f * 1.6, cols, rng, 5 + f)
    return c


def scene_font(rng):
    c = Canvas(S, S, '#0e0e18')
    rp = ramp_of(rng)
    for y in range(12, S, 14):
        for x in range(0, S, 2):
            c.px(x, y, rp[1], 0.35)
    c.text(rng.choice(['ABC', 'AAZ', 'PXL', 'GO!', 'K.O', 'XYZ']), 15, 10, lambda row: rp[3] if row < 2 else rp[2] if row < 4 else rp[1], 6, rp[0])
    c.text(rng.choice(['PIXEL FONT', 'GAME OVER', 'LEVEL UP!', 'HIGH SCORE']), 8, 50, WHITE, 2, OUT)
    c.text('0123456789', 8, 66, RAMPS['steel'][3], 2)
    for i, col in enumerate([rp[0], rp[1], rp[2], rp[3], WHITE]):
        c.rect(8 + i * 10, 82, 8, 6, col)
    c.text('A-Z', 66, 83, RAMPS['steel'][2])
    return c


def iso_cube(c, sx, sy, rp):
    for y in range(8):
        hw = y * 2 + 2 if y < 4 else (8 - y) * 2
        for x in range(-hw, hw):
            c.px(sx + x, sy + y, rp[3] if y == 0 or abs(x) >= hw - 1 else rp[2])
    for x in range(8):
        top = sy + 4 + x // 2
        for y in range(8):
            c.px(sx - 8 + x, top + y, rp[0] if y == 7 else rp[1])
    for x in range(8):
        top = sy + 7 - x // 2
        for y in range(8):
            c.px(sx + x, top + y, rp[0])


def scene_3d(rng):
    c = Canvas(S, S)
    tint = ramp_of(rng)
    backdrop(c, tint[1])
    c.glow(48, 46, 44, tint[1], 0.45)
    N = 4
    heights = [[1 + (1 if rng.random() < 0.35 else 0) + (1 if gx + gy < 2 and rng.random() < 0.5 else 0) for gy in range(N)] for gx in range(N)]
    top = rng.choice([RAMPS['leaf'], RAMPS['lime'], RAMPS['pink'], RAMPS['cyan']])
    c.shadow(48, 74, 34, 8)
    cubes = [(gx, gy, gz, top if gz == heights[gx][gy] - 1 else RAMPS['wood']) for gx in range(N) for gy in range(N) for gz in range(heights[gx][gy])]
    tx, ty = rng.randint(0, N - 1), rng.randint(0, N - 1)
    h0 = heights[tx][ty]
    cubes += [(tx, ty, h0, RAMPS['wood']), (tx, ty, h0 + 1, RAMPS['leaf']), (tx, ty, h0 + 2, RAMPS['leaf'])] if rng.random() < 0.5 else [(tx, ty, h0, tint), (tx, ty, h0 + 1, tint)]
    cubes.sort(key=lambda q: (q[0] + q[1], q[2]))
    for gx, gy, gz, rp in cubes:
        iso_cube(c, 48 + (gx - gy) * 8, 30 + (gx + gy) * 4 - gz * 8 + 16, rp)
    return c


def scene_sfx(rng):
    c = Canvas(S, S)
    rp = ramp_of(rng)
    backdrop(c, rp[1])
    for x in range(0, S, 2):
        c.px(x, 48, rp[1], 0.6)
    c.rect(6, 44, 6, 10, RAMPS['steel'][2]); c.rect(6, 44, 6, 1, RAMPS['steel'][3])
    for i in range(8):
        c.rect(12 + i, 44 - i, 1, 10 + i * 2, rp[2] if i > 1 else RAMPS['steel'][2])
    for a in range(3):
        R = 6 + a * 5
        t = -0.8
        while t <= 0.8:
            c.px(22 + math.cos(t) * R, 48 + math.sin(t) * R * 1.2, rp[max(1, 3 - a)])
            t += 0.06
    for i in range(18):
        x = 40 + i * 3
        shape = (i + 1) / 3 if i < 3 else math.exp(-(i - 3) / 6)
        env = max(2, round((10 + rng.random() * 26) * shape))
        for y in range(-env, env + 1):
            t = abs(y) / env
            c.rect(x, 48 + y, 2, 1, rp[3] if t < 0.3 else rp[2] if t < 0.7 else rp[1])
    c.text(rng.choice(['SFX', 'BOOM', 'ZAP!', 'PEW', 'HIT!']), 8, 82, rp[3])
    return c


def scene_music(rng):
    c = Canvas(S, S)
    rp = ramp_of(rng)
    backdrop(c, rp[1])
    for col in range(11):
        x, level = 6 + col * 8, rng.randint(3, 11)
        for sgm in range(level):
            colr = RAMPS['rose'][2] if sgm > 8 else RAMPS['amber'][2] if sgm > 5 else rp[2]
            c.rect(x, 72 - sgm * 5, 6, 3, colr); c.rect(x, 72 - sgm * 5, 6, 1, mix(colr, WHITE, 0.4))
        c.rect(x, 72 - (level + 1) * 5, 6, 1, WHITE)
    for _ in range(3):
        nx, ny = rng.randint(6, 80), rng.randint(4, 20)
        c.rect(nx + 2, ny, 1, 7, rp[2]); c.rect(nx, ny + 6, 3, 2, rp[2]); c.rect(nx + 2, ny, 4, 1, rp[2])
    c.rect(0, 80, S, 16, '#e9e6f5')
    for k in range(0, S, 7):
        c.rect(k, 80, 1, 16, '#9a97b0')
        if (k // 7) % 7 in (0, 1, 3, 4, 5):
            c.rect(k + 4, 80, 4, 9, OUT)
    c.rect(0, 80, S, 1, rp[2])
    return c


SCENES = {
    'sprites': scene_sprites, 'tilesets': scene_tileset, 'characters': scene_characters, 'ui': scene_ui,
    'backgrounds': scene_background, 'vfx': scene_vfx, 'fonts': scene_font, '3d': scene_3d,
    'sfx': scene_sfx, 'music': scene_music,
}


def thumbnail_png(seed, category_key):
    """Square category-aware thumbnail, 384px, as PNG bytes."""
    c = SCENES.get(category_key, scene_sprites)(make_rng('thumb', category_key, seed))
    return c.png(max(1, 384 // c.w))


def sprite_sheet_png(seed, frames, kind='sprites'):
    """Horizontal sprite sheet with `frames` cells (32x32 logical each), upscaled 4x."""
    rng = make_rng('sheet', seed)
    cell = 32
    c = Canvas(cell * frames, cell)
    if kind == 'vfx':
        cols, k = rng.choice(VFX_SETS), rng.randint(5, 9)
        for f in range(frames):
            t = f / max(1, frames - 1)
            burst(c, f * cell + 16, 16, 2 + math.sin(t * math.pi) * 13, cols[:-1] if t > 0.75 else cols, make_rng('burst', seed, f), k)
    elif kind == 'characters':
        look = rng.random()
        for f in range(frames):
            g = humanoid(make_rng('look', seed, round(look * 1000)), f)
            c.shadow(f * cell + 16, 30, 7, 1)
            c.blit(g, f * cell + 16 - 9, 31 - g.height)
    else:
        base = creature(rng)
        for f in range(frames):
            lift = round((math.sin(f / frames * math.tau) + 1) * 2)
            c.shadow(f * cell + 16, 29, 7 - lift / 2, 1)
            c.blit(base, f * cell + 16 - 9, 28 - base.height - lift)
    return c.png(4)


def avatar_png(seed):
    """20x20 pixel portrait scaled 6x (120px)."""
    rng = make_rng('avatar', seed)
    bg, skin = ramp_of(rng), rng.choice(SKINS)
    hair, cloth = RAMPS[rng.choice(['wood', 'amber', 'steel', 'rose', 'violet', 'stone'])], ramp_of(rng)
    c = Canvas(20, 20)
    c.gradient(0, 0, 20, 20, [bg[2], bg[1], bg[0]])
    g = Canvas(20, 20)
    g.rect(2, 16, 16, 4, cloth[2]); g.rect(2, 16, 16, 1, cloth[3]); g.rect(13, 17, 5, 3, cloth[1])
    g.rect(8, 14, 4, 2, skin[1]); g.rect(5, 4, 10, 10, skin[2]); g.rect(6, 5, 3, 2, skin[3]); g.rect(14, 4, 1, 10, skin[1])
    g.rect(7, 8, 2, 2, OUT); g.rect(11, 8, 2, 2, OUT); g.px(7, 8, WHITE); g.px(11, 8, WHITE); g.rect(9, 11, 2, 1, skin[0])
    g.rect(5, 2, 10, 4, hair[2]); g.rect(6, 2, 4, 1, hair[3]); g.rect(5, 6, 1, 2, hair[1]); g.rect(14, 6, 1, 2, hair[1])
    c.blit(outline(g.im), 0, 0)
    return c.png(6)


def banner_png(seed, w=192, h=48):
    c = Canvas(w, h)
    draw_landscape(c, make_rng('banner', seed), w, h)
    return c.png(4)


def illustration_png(kind):
    """Transparent 48x48 spot illustration (scaled 4x) for empty and error states."""
    c = Canvas(16, 16)
    P, C, K, A, L = RAMPS['violet'], RAMPS['cyan'], RAMPS['pink'], RAMPS['amber'], RAMPS['lime']
    if kind == 'ghost':
        c.rect(5, 2, 6, 1, P[3]); c.rect(4, 3, 8, 9, P[2]); c.rect(3, 5, 10, 7, P[2]); c.rect(3, 12, 2, 2, P[2]); c.rect(7, 12, 2, 2, P[2]); c.rect(11, 12, 2, 2, P[2])
        c.rect(3, 5, 2, 6, P[3]); c.rect(6, 6, 2, 3, OUT); c.rect(10, 6, 2, 3, OUT); c.px(6, 6, WHITE); c.px(10, 6, WHITE); c.rect(8, 10, 2, 1, OUT)
    elif kind == 'cart':
        c.rect(1, 2, 2, 1, RAMPS['steel'][2]); c.rect(2, 3, 1, 2, RAMPS['steel'][2]); c.rect(3, 4, 11, 1, P[3]); c.rect(3, 5, 11, 5, P[2]); c.rect(4, 10, 9, 1, P[1])
        for x in (5, 8, 11):
            c.rect(x, 6, 1, 3, P[1])
        c.rect(4, 12, 3, 3, C[2]); c.rect(10, 12, 3, 3, C[2]); c.rect(5, 12, 1, 1, WHITE); c.rect(11, 12, 1, 1, WHITE)
    elif kind == 'search':
        c.rect(5, 2, 5, 1, C[3]); c.rect(3, 3, 9, 7, C[2]); c.rect(4, 4, 7, 5, C[1]); c.rect(5, 4, 2, 2, WHITE); c.rect(4, 10, 6, 1, C[3])
        c.rect(10, 10, 2, 2, RAMPS['wood'][2]); c.rect(12, 12, 2, 2, RAMPS['wood'][2]); c.rect(13, 13, 2, 2, RAMPS['wood'][1])
    elif kind == 'chest':
        c.rect(2, 4, 12, 3, RAMPS['wood'][2]); c.rect(2, 4, 12, 1, RAMPS['wood'][3]); c.rect(2, 7, 12, 6, RAMPS['wood'][1]); c.rect(2, 7, 12, 1, A[2]); c.rect(7, 6, 2, 3, A[3]); c.px(8, 7, OUT)
        c.rect(1, 4, 1, 9, RAMPS['steel'][2]); c.rect(14, 4, 1, 9, RAMPS['steel'][1])
    elif kind == 'heart':
        c.rect(2, 3, 4, 3, K[2]); c.rect(9, 3, 4, 3, K[2]); c.rect(1, 5, 14, 3, K[2]); c.rect(2, 8, 12, 2, K[2]); c.rect(4, 10, 8, 2, K[1]); c.rect(6, 12, 4, 2, K[1]); c.rect(3, 4, 2, 2, WHITE)
    elif kind == 'skull':
        c.rect(4, 2, 8, 8, RAMPS['steel'][3]); c.rect(3, 4, 10, 5, RAMPS['steel'][3]); c.rect(5, 10, 6, 3, RAMPS['steel'][2]); c.rect(5, 5, 2, 3, OUT); c.rect(9, 5, 2, 3, OUT); c.rect(7, 8, 2, 1, OUT); c.rect(6, 11, 1, 2, OUT); c.rect(9, 11, 1, 2, OUT)
    elif kind == 'star':
        c.rect(7, 1, 2, 3, A[3]); c.rect(1, 5, 14, 3, A[2]); c.rect(3, 8, 10, 3, A[2]); c.rect(3, 11, 3, 3, A[1]); c.rect(10, 11, 3, 3, A[1]); c.rect(5, 4, 6, 2, A[3])
    elif kind == 'slime':
        c.rect(4, 5, 8, 2, L[3]); c.rect(2, 7, 12, 6, L[2]); c.rect(1, 10, 14, 4, L[2]); c.rect(1, 12, 14, 2, L[1]); c.rect(4, 8, 2, 3, OUT); c.rect(10, 8, 2, 3, OUT); c.px(4, 8, WHITE); c.px(10, 8, WHITE)
    else:  # gem
        c.rect(4, 3, 8, 2, C[3]); c.rect(2, 5, 12, 3, C[2]); c.rect(4, 8, 8, 2, C[1]); c.rect(6, 10, 4, 2, C[1]); c.px(5, 4, WHITE)
    sprite = outline(c.im)
    out = Canvas(20, 20)
    out.shadow(10, 17, 6, 1.3)
    out.im.paste(sprite, (2, 1), sprite)
    for x, y, col in ((2, 3, P[2]), (17, 5, C[2]), (15, 2, K[3])):
        sparkle(out, x, y, col)
    return out.png(6)
