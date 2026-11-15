from django.db import migrations

CATEGORIES = [
    ('sprites', 'Sprites', 'image', 'sparkles', 'Characters, items and effects ready for your engine.'),
    ('tilesets', 'Tilesets', 'image', 'grid-3x3', 'Seamless tiles and autotiles for every biome.'),
    ('characters', 'Characters', 'image', 'user', 'Animated rigs, portraits and NPC sheets.'),
    ('ui', 'UI Kits', 'image', 'layout-template', 'Menus, HUDs and dialog boxes with a cohesive style.'),
    ('backgrounds', 'Backgrounds', 'image', 'image', 'Parallax scenes and painted backdrops.'),
    ('vfx', 'VFX', 'image', 'zap', 'Particle sheets and shader-ready effects.'),
    ('fonts', 'Fonts', 'other', 'type', 'Pixel and display fonts for every language.'),
    ('3d', '3D Models', 'other', 'box', 'Low-poly models with clean topology.'),
    ('sfx', 'Sound Effects', 'audio', 'audio-lines', 'UI blips, impacts and ambience loops.'),
    ('music', 'Music', 'audio', 'music', 'Chiptune and synth loops for your soundtrack.'),
]


def create_categories(apps, schema_editor):
    Category = apps.get_model('catalog', 'Category')
    for order, (key, name, kind, icon, desc) in enumerate(CATEGORIES):
        Category.objects.update_or_create(
            key=key, defaults={'name': name, 'media_kind': kind, 'icon': icon, 'description': desc, 'order': order}
        )


def remove_categories(apps, schema_editor):
    apps.get_model('catalog', 'Category').objects.filter(key__in=[c[0] for c in CATEGORIES]).delete()


class Migration(migrations.Migration):
    dependencies = [('catalog', '0001_initial')]
    operations = [migrations.RunPython(create_categories, remove_categories)]
