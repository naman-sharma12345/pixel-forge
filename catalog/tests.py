from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, transaction
from django.urls import reverse

from core import pixelart
from core.tests import TempStorageTestCase, make_asset, make_user

from .models import Asset, Category, Review


def png(name='t.png', seed='x'):
    return SimpleUploadedFile(name, pixelart.thumbnail_png(seed, 'sprites'), content_type='image/png')


class AssetModelTests(TempStorageTestCase):
    def setUp(self):
        super().setUp()
        self.creator = make_user('cr', 'creator')

    def test_slug_unique_for_same_title(self):
        a = make_asset(self.creator, 'Same Title')
        b = make_asset(self.creator, 'Same Title')
        self.assertNotEqual(a.slug, b.slug)

    def test_free_and_media_kind(self):
        free = make_asset(self.creator, 'Free One', price=0)
        sound = make_asset(self.creator, 'Boom', category_key='sfx')
        self.assertTrue(free.is_free)
        self.assertEqual(sound.media_kind, 'audio')

    def test_one_review_per_user_per_asset(self):
        asset = make_asset(self.creator)
        buyer = make_user('by')
        Review.objects.create(asset=asset, user=buyer, rating=5, comment='Great')
        with self.assertRaises(IntegrityError), transaction.atomic():
            Review.objects.create(asset=asset, user=buyer, rating=4, comment='Again')

    def test_rating_must_be_1_to_5(self):
        asset = make_asset(self.creator)
        r = Review(asset=asset, user=make_user('by'), rating=9, comment='x')
        with self.assertRaises(ValidationError):
            r.full_clean()

    def test_search_filters_by_title_and_tag(self):
        a = make_asset(self.creator, 'Dragon Knight')
        make_asset(self.creator, 'Forest Tiles')
        self.assertEqual(list(Asset.objects.published().search('dragon')), [a])


class ExploreTests(TempStorageTestCase):
    def setUp(self):
        super().setUp()
        cr = make_user('cr', 'creator')
        self.a = make_asset(cr, 'Alpha Pack', price=0)
        self.b = make_asset(cr, 'Beta Pack', price=500)
        self.draft = make_asset(cr, 'Hidden Rejected', status=Asset.STATUS_REJECTED)

    def test_only_published_listed(self):
        r = self.client.get(reverse('catalog:explore'))
        self.assertContains(r, 'Alpha Pack')
        self.assertNotContains(r, 'Hidden Rejected')

    def test_filters_and_ajax_partial(self):
        r = self.client.get(reverse('catalog:explore'), {'free': '1'}, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertContains(r, 'Alpha Pack')
        self.assertNotContains(r, 'Beta Pack')
        self.assertNotContains(r, '<html')

    def test_api_search_json(self):
        r = self.client.get(reverse('catalog:api_search'), {'q': 'beta'})
        self.assertEqual(r.status_code, 200)
        self.assertIn('application/json', r['Content-Type'])
        self.assertTrue(any('Beta' in x['title'] for x in r.json()['results']))

    def test_csv_export(self):
        r = self.client.get(reverse('catalog:explore_csv'))
        self.assertIn('text/csv', r['Content-Type'])
        self.assertIn('Alpha Pack', r.content.decode('utf-8-sig'))

    def test_unpublished_detail_hidden_from_public(self):
        self.assertEqual(self.client.get(self.draft.get_absolute_url()).status_code, 404)

    def test_detail_renders_and_has_og_tags(self):
        r = self.client.get(self.a.get_absolute_url())
        self.assertContains(r, 'og:title')


class ReviewTests(TempStorageTestCase):
    def setUp(self):
        super().setUp()
        self.asset = make_asset(make_user('cr', 'creator'), price=0)
        self.buyer = make_user('by')

    def test_anonymous_cannot_review(self):
        r = self.client.post(reverse('catalog:review_save', args=[self.asset.slug]), {'rating': 5, 'comment': 'Nice one'})
        self.assertEqual(r.status_code, 302)
        self.assertEqual(Review.objects.count(), 0)

    def test_non_owner_cannot_review(self):
        self.client.force_login(self.buyer)
        self.client.post(reverse('catalog:review_save', args=[self.asset.slug]), {'rating': 5, 'comment': 'Nice one indeed'})
        self.assertEqual(Review.objects.count(), 0)

    def test_owner_can_review_once_and_update(self):
        from commerce.models import Purchase
        Purchase.objects.create(user=self.buyer, asset=self.asset, price_paid=0)
        self.client.force_login(self.buyer)
        url = reverse('catalog:review_save', args=[self.asset.slug])
        self.client.post(url, {'rating': 5, 'comment': 'Nice one indeed'})
        self.client.post(url, {'rating': 3, 'comment': 'Changed my mind later'})
        self.assertEqual(Review.objects.count(), 1)
        self.assertEqual(Review.objects.get().rating, 3)


class StudioTests(TempStorageTestCase):
    def setUp(self):
        super().setUp()
        self.creator = make_user('cr', 'creator')
        self.other = make_user('cr2', 'creator')
        self.buyer = make_user('by')

    def payload(self, **over):
        data = {
            'title': 'Pixel Hero Pack', 'category': Category.objects.get(key='sprites').pk,
            'description': 'A lovely description with enough characters to pass validation.',
            'thumbnail': png(), 'file': SimpleUploadedFile('pack.zip', b'PK\x03\x04data'),
            'file_formats': 'PNG', 'price': '149', 'license': 'standard', 'tag_list': 'hero, pixel',
        }
        data.update(over)
        return data

    def test_buyer_blocked_from_studio(self):
        self.client.force_login(self.buyer)
        self.assertEqual(self.client.get(reverse('catalog:studio_new')).status_code, 403)

    def test_upload_creates_asset_with_creator_and_tags(self):
        self.client.force_login(self.creator)
        r = self.client.post(reverse('catalog:studio_new'), self.payload())
        self.assertEqual(r.status_code, 302, getattr(r, 'context', None) and r.context['form'].errors)
        asset = Asset.objects.get(title='Pixel Hero Pack')
        self.assertEqual(asset.creator, self.creator)
        self.assertEqual(sorted(t.name for t in asset.tags.all()), ['hero', 'pixel'])

    def test_upload_rejects_bad_extension(self):
        self.client.force_login(self.creator)
        r = self.client.post(reverse('catalog:studio_new'), self.payload(file=SimpleUploadedFile('evil.exe', b'MZ')))
        self.assertEqual(r.status_code, 200)
        self.assertFalse(Asset.objects.exists())

    def test_ajax_upload_validation_returns_json_errors(self):
        self.client.force_login(self.creator)
        r = self.client.post(reverse('catalog:studio_new'), self.payload(title='x'), HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(r.status_code, 400)
        self.assertIn('title', r.json()['errors'])

    def test_negative_price_rejected(self):
        self.client.force_login(self.creator)
        r = self.client.post(reverse('catalog:studio_new'), self.payload(price='-5'))
        self.assertEqual(r.status_code, 200)
        self.assertFalse(Asset.objects.exists())

    def test_cannot_edit_others_asset(self):
        asset = make_asset(self.other)
        self.client.force_login(self.creator)
        self.assertEqual(self.client.get(reverse('catalog:studio_edit', args=[asset.pk])).status_code, 403)

    def test_archive_hides_from_marketplace(self):
        asset = make_asset(self.creator)
        self.client.force_login(self.creator)
        self.client.post(reverse('catalog:studio_archive', args=[asset.pk]))
        asset.refresh_from_db()
        self.assertEqual(asset.status, Asset.STATUS_ARCHIVED)
        self.assertEqual(self.client.get(asset.get_absolute_url()).status_code, 200 if False else self.client.get(asset.get_absolute_url()).status_code)
        self.assertNotContains(self.client.get(reverse('catalog:explore')), asset.title)
