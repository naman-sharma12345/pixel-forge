"""Seed the database with demo users, assets, files, orders, purchases and reviews.

    python manage.py seed_demo            # only seeds an empty database
    python manage.py seed_demo --reset    # wipes data and uploaded files first

Port of the legacy legacy/server/scripts/seed.js: pixel art with Pillow, sound effects and
chiptune loops with the wave module, small .obj models, ~48 assets, paid orders spread over
the last 60 days, purchases and reviews.
"""
import io
import random
import shutil
import zipfile
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from accounts.models import CreatorProfile, User
from catalog.models import Asset, AssetPreview, Category, Review, Tag
from commerce.models import CartItem, Order, OrderItem, Purchase, earning_for, fee_for
from core import pixelart, synth

PASSWORD = 'Password123'

CREATORS = [
    ('Mira Pixel', 'mirapixel', 'Chiptune composer and sprite artist. Making cute things since 2019.'),
    ('Jonas Vex', 'jonasvex', 'Environment artist: tilesets, parallax backgrounds and mood.'),
    ('Koko Labs', 'kokolabs', 'Small studio shipping UI kits and icon packs.'),
    ('ByteForge', 'byteforge', 'Tools, fonts and 3D props for jam games.'),
    ('Ana Reyes', 'anareyes', 'Character designer and animator. SFX hobbyist.'),
    ('Null Pointer', 'nullptr', 'VFX and shader-ish juice for your gameplay.'),
]
BUYERS = [
    ('Demo Player', 'demo'), ('Riya Sen', 'riyasen'), ('Leo Park', 'leopark'), ('Sam Okafor', 'samokafor'),
    ('Ivy Chen', 'ivychen'), ('Theo Brandt', 'theob'), ('Maya Iyer', 'mayaiyer'), ('Kai Ruiz', 'kairuiz'),
]

TITLES = {
    'sprites': ['Tiny Adventurer Pack', 'Slime & Critter Set', 'Weapon Icons Vol. 2', 'RPG Item Sprites', 'Enemy Fleet Pack', 'Pixel Pets Bundle'],
    'tilesets': ['Forest Tileset v3', 'Cyberpunk City Tiles', 'Desert Ruins Tiles', 'Ice Cavern Tileset', 'Dungeon Tiles Premium'],
    'characters': ['Hero Rig Pack', 'Villager Character Set', 'Monster Bestiary', 'Protagonist Portraits', 'Mech Pilot Characters'],
    'ui': ['Fantasy RPG UI Kit', 'Sci-Fi HUD Pack', 'Mobile Game UI Kit', 'Inventory & Dialog System', 'Pixel Button Pack'],
    'backgrounds': ['Neon City Parallax', 'Pixel Forest Backgrounds', 'Space Station Backdrops', 'Underground Cave Set', 'Sunset Beach Scene'],
    'vfx': ['Explosion Sprite Sheet', 'Magic Spell VFX', 'Weather & Particle Pack', 'Hit & Damage Effects', 'Portal & Teleport FX'],
    'fonts': ['Press Start Future', 'Pixel Quest Font', 'Arcade Chunks', 'Retro Terminal Font'],
    '3d': ['Low-Poly Props Pack', 'Sci-Fi Corridor Kit', 'RPG Item Models', 'Nature Props Set'],
    'sfx': ['UI Sound Pack', 'Retro Combat SFX', 'Platformer Jump & Land', 'Explosion & Impact Pack', 'Pickup & Coin SFX'],
    'music': ['Chiptune Battle Themes', 'Lo-fi Pixel Loops', '8-bit Overworld Pack', 'Synthwave Drive Loops', 'Boss Battle Suite'],
}
TAGS = {
    'sprites': ['pixel-art', '2d', 'rpg', 'top-down', 'retro', '16-bit'],
    'tilesets': ['tiles', 'autotile', 'parallax', 'platformer', 'top-down', 'pixel-art'],
    'characters': ['animated', 'rigged', 'pixel-art', 'npc', 'portrait', 'idle'],
    'ui': ['ui-kit', 'hud', 'responsive', 'pixel-art', 'mobile', 'inventory'],
    'backgrounds': ['parallax', 'pixel-art', '16-bit', 'scene', 'landscape', 'loop'],
    'vfx': ['particles', 'sprite-sheet', 'pixel-art', 'juice', 'effects', 'loop'],
    'fonts': ['pixel-font', 'ttf', 'otf', '8bit', 'display', 'retro'],
    '3d': ['low-poly', 'obj', 'fbx', 'props', 'stylized', 'blender'],
    'sfx': ['wav', 'ogg', 'retro', 'ui', 'loop', '8-bit'],
    'music': ['chiptune', '8-bit', 'loop', 'wav', 'ogg', 'royalty-free'],
}
FORMATS = {
    'sprites': 'png,aseprite,gif', 'tilesets': 'png,tsx,aseprite', 'characters': 'png,aseprite,gif',
    'ui': 'png,psd', 'backgrounds': 'png,jpg,psd', 'vfx': 'png,gif', 'fonts': 'ttf,otf,woff2',
    '3d': 'obj,fbx,blend', 'sfx': 'wav,ogg,mp3', 'music': 'wav,ogg,mp3',
}
SFX_NAMES = ['coin', 'jump', 'laser', 'explosion', 'powerup', 'hit', 'blip']
COMMENTS = [
    'Exactly what I needed for my jam game. Clean files, great docs.',
    'Love the style. Fits perfectly with my pixel art. Instant buy.',
    'Good quality overall. Would love a few more color variants.',
    'Used this in my shipped game. Players keep complimenting the art!',
    'Solid pack. The license is clear and the files are well organised.',
    'Decent, though I expected a few more frames in the animation sheet.',
    'Amazing value for the price. Highly recommended.',
    'Works great with Godot and Unity. No complaints.',
]


class Command(BaseCommand):
    help = 'Seed demo users, ~48 assets with generated files, orders, purchases and reviews.'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Delete existing data and uploaded files first.')

    def handle(self, *args, **opts):
        if opts['reset']:
            self.reset()
        elif Asset.objects.exists():
            self.stdout.write(self.style.WARNING('Database already has assets. Use --reset to start over.'))
            return
        rng = random.Random(20260101)
        hashed = make_password(PASSWORD)
        with transaction.atomic():
            users = self.make_users(rng, hashed)
            assets = self.make_assets(rng, users['creators'])
            self.make_commerce(rng, users['buyers'], assets)
        self.stdout.write(self.style.SUCCESS(
            f'Seeded {User.objects.count()} users, {Asset.objects.count()} assets, '
            f'{Order.objects.filter(status="paid").count()} paid orders, {Purchase.objects.count()} purchases, '
            f'{Review.objects.count()} reviews.'
        ))
        self.stdout.write(f'Logins (password {PASSWORD}): admin / admin@pixelforge.dev, demo (buyer), mirapixel (creator).')

    # ------------------------------------------------------------------ reset
    def reset(self):
        for model in (CartItem, Purchase, OrderItem, Order, Review, AssetPreview, Asset, Tag, CreatorProfile, User):
            model.objects.all().delete()
        for folder in (settings.MEDIA_ROOT / 'avatars', settings.MEDIA_ROOT / 'thumbnails', settings.MEDIA_ROOT / 'previews',
                       settings.PRIVATE_FILES_ROOT / 'files'):
            shutil.rmtree(folder, ignore_errors=True)
        self.stdout.write('Cleared existing data and uploaded files.')

    # ------------------------------------------------------------------ users
    def make_users(self, rng, hashed):
        now = timezone.now()
        admin = User(username='admin', email='admin@pixelforge.dev', first_name='Forge Admin', role='admin',
                     is_staff=True, is_superuser=True, password=hashed, bio='Keeps the forge fires burning.',
                     date_joined=now - timedelta(days=200))
        admin.save()
        creators, buyers = [], []
        for name, username, blurb in CREATORS:
            u = User(username=username, email=f'{username}@example.com', first_name=name, role='creator', bio=blurb[:300],
                     password=hashed, date_joined=now - timedelta(days=rng.randint(90, 300)),
                     website=f'https://{username}.example.com', twitter=f'@{username}', github=username)
            u.save()
            CreatorProfile.objects.create(user=u, tagline=blurb[:120])
            creators.append(u)
        for i, (name, username) in enumerate(BUYERS):
            u = User(username=username, email=f'{username}@example.com', first_name=name, role='buyer', password=hashed,
                     date_joined=now - timedelta(days=rng.randint(1, 29) if i else 40), bio='Just here to browse the forge.' if i == 0 else '')
            u.save()
            buyers.append(u)
        return {'admin': admin, 'creators': creators, 'buyers': buyers}

    # ----------------------------------------------------------------- assets
    def make_assets(self, rng, creators):
        cats = {c.key: c for c in Category.objects.all()}
        tag_cache = {}
        assets, now, n = [], timezone.now(), 0
        for key, titles in TITLES.items():
            cat = cats[key]
            for i, title in enumerate(titles):
                creator = creators[n % len(creators)]
                n += 1
                seed = f'{key}-{i}-{title}'
                free = rng.random() < 0.3
                price = 0 if free else (rng.randint(5, 300) * 10 + 9)
                asset = Asset(
                    creator=creator, category=cat, title=title, price=price,
                    license=rng.choice(['cc0', 'standard', 'extended']) if not free else rng.choice(['cc0', 'standard']),
                    description=(f'{title}: a polished {cat.name.lower().rstrip("s")} pack built for indie developers.\n\n'
                                 'Includes every file listed, clear licensing and lifetime updates. '
                                 'Perfect for game jams, prototypes and shipped titles.'),
                    file_formats=FORMATS[key], created_at=now - timedelta(days=rng.randint(1, 120), hours=rng.randint(0, 23)),
                )
                previews, main = self.build_files(rng, asset, key, seed, title)
                asset.thumbnail.save(f'{slugify(title)}.png', ContentFile(pixelart.thumbnail_png(seed, key)), save=False)
                asset.file.save(main[0], ContentFile(main[1]), save=False)
                roll = rng.random()
                if roll > 0.94:
                    asset.status = Asset.STATUS_REJECTED if roll < 0.97 else Asset.STATUS_ARCHIVED
                    if asset.status == Asset.STATUS_REJECTED:
                        asset.rejection_reason = 'Thumbnail does not match the described content.'
                asset.views = rng.randint(50, 4000)
                asset.save()
                for order, (kind, fname, data) in enumerate(previews):
                    p = AssetPreview(asset=asset, kind=kind, order=order)
                    p.file.save(fname, ContentFile(data), save=False)
                    p.save()
                tags = []
                for name in rng.sample(TAGS[key], rng.randint(2, 4)):
                    tag = tag_cache.get(name) or Tag.objects.get_or_create(name=name, defaults={'slug': slugify(name)})[0]
                    tag_cache[name] = tag
                    tags.append(tag)
                asset.tags.set(tags)
                assets.append(asset)
        published = [a for a in assets if a.status == Asset.STATUS_PUBLISHED]
        for a in published[::5][:6]:
            a.is_featured = True
            a.save(update_fields=['is_featured'])
        return assets

    def build_files(self, rng, asset, key, seed, title):
        """Return (previews, main_file). previews = [(kind, filename, bytes)], main = (filename, bytes)."""
        base = slugify(title)
        if key in ('sfx', 'music'):
            if key == 'sfx':
                names = rng.sample(SFX_NAMES, 2)
                wavs = [(n, synth.sound_effect(n)) for n in names]
            else:
                wavs = [(f'loop-{k}', to_bytes(synth.chiptune_loop(seed=rng.randint(1, 10**6), bpm=rng.choice([100, 110, 120, 140])))) for k in range(2)]
            previews = [('audio', f'{base}-preview-{i + 1}.wav', data) for i, (_, data) in enumerate(wavs)]
            asset.duration_sec = synth.duration_of(wavs[0][1])
            asset.bpm = rng.choice([90, 100, 110, 120, 128, 140]) if key == 'music' else None
            asset.loopable = key == 'music' or rng.random() < 0.4
            return previews, (f'{base}.wav', wavs[0][1])
        if key == '3d':
            obj = synth.obj_model(seed)
            asset.resolution = 'low-poly'
            return [('image', f'{base}-view.png', pixelart.thumbnail_png(seed + '-v', key))], (f'{base}.obj', obj)
        if key == 'fonts':
            sample = pixelart.thumbnail_png(seed + '-v', key)
            return [('image', f'{base}-specimen.png', sample)], (f'{base}.zip', make_zip({'specimen.png': sample, 'README.txt': f'{title}\nDemo font pack: glyph specimen only.\n'.encode()}))
        previews, files = [], {}
        if key in ('sprites', 'vfx', 'characters'):
            asset.frames = rng.randint(6, 12)
            sheet = pixelart.sprite_sheet_png(seed, asset.frames, key)
            previews.append(('image', f'{base}-sheet.png', sheet))
            files['spritesheet.png'] = sheet
        asset.resolution = rng.choice(['16x16', '32x32', '64x64', '128x128']) if key != 'backgrounds' else '1920x1080'
        for k in range(rng.randint(1, 2)):
            png = pixelart.thumbnail_png(f'{seed}-p{k}', key)
            previews.append(('image', f'{base}-preview-{k + 1}.png', png))
            files[f'preview-{k + 1}.png'] = png
        files['LICENSE.txt'] = f'License: {asset.get_license_display()}\n'.encode()
        return previews, (f'{base}.zip', make_zip(files))

    # --------------------------------------------------------------- commerce
    def make_commerce(self, rng, buyers, assets):
        now = timezone.now()
        published = [a for a in assets if a.status == Asset.STATUS_PUBLISHED]
        paid = [a for a in published if a.price > 0]
        free = [a for a in published if a.price == 0]
        owned = set()
        purchases = []
        demo = buyers[0]
        for _ in range(150):
            buyer = demo if rng.random() < 0.08 else rng.choice(buyers[1:])
            picks = [a for a in rng.sample(paid, rng.randint(1, 3)) if (buyer.id, a.id) not in owned]
            if not picks:
                continue
            when = now - timedelta(days=rng.randint(0, 60), hours=rng.randint(0, 23), minutes=rng.randint(0, 59))
            subtotal = sum(a.price for a in picks)
            order = Order.objects.create(user=buyer, subtotal=subtotal, platform_fee=fee_for(subtotal), total=subtotal,
                                         status=Order.STATUS_PAID, created_at=when, paid_at=when)
            for a in picks:
                OrderItem.objects.create(order=order, asset=a, title=a.title, price=a.price, creator=a.creator, creator_earning=earning_for(a.price))
                purchases.append(Purchase(user=buyer, asset=a, order=order, price_paid=a.price, created_at=when,
                                          download_count=rng.randint(0, 4), last_downloaded_at=when if rng.random() < 0.7 else None))
                owned.add((buyer.id, a.id))
        for buyer in buyers:
            for a in rng.sample(free, min(len(free), rng.randint(1, 4))):
                if (buyer.id, a.id) in owned:
                    continue
                when = now - timedelta(days=rng.randint(0, 60))
                purchases.append(Purchase(user=buyer, asset=a, order=None, price_paid=0, created_at=when, download_count=rng.randint(0, 3)))
                owned.add((buyer.id, a.id))
        Purchase.objects.bulk_create(purchases)
        reviews = []
        for p in purchases:
            if rng.random() < 0.55 and p.asset.creator_id != p.user_id:
                rating = rng.choices([3, 4, 5], weights=[2, 4, 5])[0]
                reviews.append(Review(asset=p.asset, user=p.user, rating=rating, comment=rng.choice(COMMENTS), created_at=p.created_at + timedelta(days=rng.randint(0, 5))))
        Review.objects.bulk_create(reviews)
        totals = {}
        for p in purchases:
            totals[p.asset_id] = totals.get(p.asset_id, 0) + p.download_count
        for a in assets:
            if a.id in totals:
                Asset.objects.filter(pk=a.pk).update(downloads=totals[a.id])
        demo_wish = rng.sample(published, 3)
        demo.wishlist.set(demo_wish)


def to_bytes(samples):
    return synth.to_wav(samples)


def make_zip(files):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, data in files.items():
            z.writestr(name, data)
    return buf.getvalue()
