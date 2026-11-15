from django.urls import reverse

from accounts.models import User
from catalog.models import Asset
from commerce import services
from core.tests import TempStorageTestCase, make_asset, make_user


class DashboardBase(TempStorageTestCase):
    def setUp(self):
        super().setUp()
        self.creator = make_user('cr', 'creator')
        self.buyer = make_user('by')
        self.admin = make_user('ad', 'admin')
        self.asset = make_asset(self.creator, price=300)


class AccessControlTests(DashboardBase):
    studio = ['dashboard:studio', 'dashboard:studio_sales', 'dashboard:sales_csv', 'dashboard:sales_pdf']
    panel = ['dashboard:admin', 'dashboard:admin_users', 'dashboard:admin_assets', 'dashboard:orders_csv', 'dashboard:summary_pdf']

    def test_anonymous_redirected(self):
        for name in self.studio + self.panel:
            r = self.client.get(reverse(name))
            self.assertEqual(r.status_code, 302, name)
            self.assertIn('/accounts/login/', r['Location'])

    def test_buyer_forbidden_everywhere(self):
        self.client.force_login(self.buyer)
        for name in self.studio + self.panel:
            self.assertEqual(self.client.get(reverse(name)).status_code, 403, name)

    def test_creator_gets_studio_not_panel(self):
        self.client.force_login(self.creator)
        for name in self.studio:
            self.assertEqual(self.client.get(reverse(name)).status_code, 200, name)
        for name in self.panel:
            self.assertEqual(self.client.get(reverse(name)).status_code, 403, name)

    def test_admin_gets_panel(self):
        self.client.force_login(self.admin)
        for name in self.panel:
            self.assertEqual(self.client.get(reverse(name)).status_code, 200, name)


class ZeroDataTests(DashboardBase):
    def test_pages_render_with_no_sales(self):
        self.client.force_login(self.creator)
        self.assertContains(self.client.get(reverse('dashboard:studio')), 'chart')
        self.client.force_login(self.admin)
        self.assertEqual(self.client.get(reverse('dashboard:admin')).status_code, 200)

    def test_exports_have_correct_content_types_with_no_data(self):
        self.client.force_login(self.creator)
        self.assertIn('text/csv', self.client.get(reverse('dashboard:sales_csv'))['Content-Type'])
        self.assertEqual(self.client.get(reverse('dashboard:sales_pdf'))['Content-Type'], 'application/pdf')
        self.client.force_login(self.admin)
        self.assertIn('text/csv', self.client.get(reverse('dashboard:orders_csv'))['Content-Type'])
        self.assertEqual(self.client.get(reverse('dashboard:summary_pdf'))['Content-Type'], 'application/pdf')


class SalesDataTests(DashboardBase):
    def setUp(self):
        super().setUp()
        order = services.create_order(self.buyer, [self.asset])
        services.confirm_payment(order, 'success')

    def test_creator_sees_only_own_sales_in_csv(self):
        other = make_user('cr2', 'creator')
        other_asset = make_asset(other, 'Other Pack', price=500)
        services.confirm_payment(services.create_order(self.buyer, [other_asset]), 'success')
        self.client.force_login(self.creator)
        body = self.client.get(reverse('dashboard:sales_csv')).content.decode('utf-8-sig')
        self.assertIn('Test Pack', body)
        self.assertNotIn('Other Pack', body)

    def test_creator_stats_totals(self):
        from dashboard.services import creator_stats
        stats = creator_stats(self.creator)
        self.assertEqual(stats['totals']['sales'], 1)
        self.assertEqual(stats['totals']['revenue'], 270)  # 300 minus the 10% platform fee
        self.assertEqual(sum(d['sales'] for d in stats['series']), 1)

    def test_admin_orders_csv_lists_paid_order(self):
        self.client.force_login(self.admin)
        body = self.client.get(reverse('dashboard:orders_csv')).content.decode('utf-8-sig')
        self.assertIn('Test Pack', body)


class AdminActionTests(DashboardBase):
    def setUp(self):
        super().setUp()
        self.client.force_login(self.admin)

    def test_ban_blocks_login_and_unban_restores(self):
        self.client.post(reverse('dashboard:admin_ban', args=[self.buyer.pk]), {'ban': '1'})
        self.buyer.refresh_from_db()
        self.assertFalse(self.buyer.is_active)
        self.client.post(reverse('dashboard:admin_ban', args=[self.buyer.pk]), {'ban': '0'})
        self.buyer.refresh_from_db()
        self.assertTrue(self.buyer.is_active)

    def test_admin_cannot_ban_self(self):
        self.client.post(reverse('dashboard:admin_ban', args=[self.admin.pk]), {'ban': '1'})
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

    def test_reject_needs_reason_then_hides_asset(self):
        url = reverse('dashboard:admin_moderate', args=[self.asset.pk])
        self.client.post(url, {'action': 'reject', 'reason': ''})
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, Asset.STATUS_PUBLISHED)
        self.client.post(url, {'action': 'reject', 'reason': 'Contains copyrighted artwork'})
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, Asset.STATUS_REJECTED)
        self.assertIn('copyrighted', self.asset.rejection_reason)

    def test_feature_only_published(self):
        url = reverse('dashboard:admin_moderate', args=[self.asset.pk])
        self.client.post(url, {'action': 'feature'})
        self.asset.refresh_from_db()
        self.assertTrue(self.asset.is_featured)
        self.client.post(url, {'action': 'archive'})
        self.asset.refresh_from_db()
        self.assertFalse(self.asset.is_featured)

    def test_buyer_cannot_moderate(self):
        self.client.force_login(self.buyer)
        r = self.client.post(reverse('dashboard:admin_moderate', args=[self.asset.pk]), {'action': 'archive'})
        self.assertEqual(r.status_code, 403)
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, Asset.STATUS_PUBLISHED)

    def test_role_change(self):
        self.client.post(reverse('dashboard:admin_role', args=[self.buyer.pk]), {'role': 'creator'})
        self.buyer.refresh_from_db()
        self.assertEqual(self.buyer.role, 'creator')
        self.assertTrue(User.objects.filter(pk=self.buyer.pk).exists())
