import tempfile
from pathlib import Path

from django.core.files.base import ContentFile
from django.test import TestCase, override_settings

from accounts.models import User
from catalog.models import Asset, Category
from core import pixelart


def make_user(username, role='buyer', **kw):
    return User.objects.create_user(username=username, email=f'{username}@example.com', password='Password123', role=role, **kw)


def make_asset(creator, title='Test Pack', price=100, status=Asset.STATUS_PUBLISHED, category_key='sprites'):
    cat = Category.objects.get(key=category_key)
    a = Asset(creator=creator, title=title, description='A description that is long enough to pass.',
              category=cat, price=price, status=status, license='standard')
    a.thumbnail.save('t.png', ContentFile(pixelart.thumbnail_png(title, category_key)), save=False)
    a.file.save('pack.zip', ContentFile(b'PK\x03\x04 demo file'), save=False)
    a.save()
    return a


class TempStorageTestCase(TestCase):
    """Redirect media and private files to a temp dir so tests never touch real data."""

    def setUp(self):
        super().setUp()
        self._tmp = tempfile.TemporaryDirectory()
        root = Path(self._tmp.name)
        self._ov = override_settings(MEDIA_ROOT=root / 'media', PRIVATE_FILES_ROOT=root / 'private')
        self._ov.enable()

    def tearDown(self):
        self._ov.disable()
        self._tmp.cleanup()
        super().tearDown()


class PublicPagesTests(TestCase):
    def test_public_pages_render(self):
        for url in ['/', '/explore/', '/accounts/login/', '/accounts/register/']:
            self.assertEqual(self.client.get(url).status_code, 200, url)

    def test_404_page_has_game(self):
        r = self.client.get('/definitely/not/here/')
        self.assertContains(r, 'minigame', status_code=404)

    def test_generated_avatar_is_png(self):
        r = self.client.get('/avatar/someone.png')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r['Content-Type'], 'image/png')

    def test_private_files_not_served_by_any_url(self):
        for url in ['/private_files/x.zip', '/media/private_files/x.zip', '/media/files/x.zip']:
            self.assertEqual(self.client.get(url).status_code, 404, url)


class PixelArtTests(TestCase):
    def test_deterministic(self):
        self.assertEqual(pixelart.thumbnail_png('seed', 'sprites'), pixelart.thumbnail_png('seed', 'sprites'))
        self.assertNotEqual(pixelart.thumbnail_png('a', 'sprites'), pixelart.thumbnail_png('b', 'sprites'))
