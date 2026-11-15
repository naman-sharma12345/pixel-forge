from django.urls import reverse

from catalog.models import Asset
from core.tests import TempStorageTestCase, make_asset, make_user

from . import services
from .models import CartItem, Order, Purchase, earning_for, fee_for


class FeeTests(TempStorageTestCase):
    def test_fee_and_earning_add_up(self):
        for price in (1, 99, 100, 149, 1999):
            self.assertEqual(fee_for(price) + earning_for(price), price)

    def test_ten_percent(self):
        self.assertEqual(fee_for(1000), 100)


class CartTests(TempStorageTestCase):
    def setUp(self):
        super().setUp()
        self.creator = make_user('cr', 'creator')
        self.buyer = make_user('by')
        self.asset = make_asset(self.creator, price=200)

    def test_anonymous_redirected(self):
        r = self.client.post(reverse('commerce:cart_add', args=[self.asset.slug]))
        self.assertEqual(r.status_code, 302)
        self.assertIn('/accounts/login/', r['Location'])

    def test_add_is_idempotent_and_ajax_json(self):
        self.client.force_login(self.buyer)
        url = reverse('commerce:cart_add', args=[self.asset.slug])
        self.client.post(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        r = self.client.post(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(r.json()['cart_count'], 1)
        self.assertEqual(CartItem.objects.count(), 1)

    def test_cannot_add_own_asset(self):
        self.client.force_login(self.creator)
        r = self.client.post(reverse('commerce:cart_add', args=[self.asset.slug]), HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(CartItem.objects.count(), 0)

    def test_cannot_add_owned_or_unpublished(self):
        Purchase.objects.create(user=self.buyer, asset=self.asset, price_paid=200)
        hidden = make_asset(self.creator, 'Hidden', status=Asset.STATUS_ARCHIVED)
        self.client.force_login(self.buyer)
        for a in (self.asset, hidden):
            r = self.client.post(reverse('commerce:cart_add', args=[a.slug]), HTTP_X_REQUESTED_WITH='XMLHttpRequest')
            self.assertEqual(r.status_code, 400)

    def test_remove(self):
        CartItem.objects.create(user=self.buyer, asset=self.asset)
        self.client.force_login(self.buyer)
        r = self.client.post(reverse('commerce:cart_remove', args=[self.asset.slug]), HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(r.json()['cart_count'], 0)


class CheckoutTests(TempStorageTestCase):
    def setUp(self):
        super().setUp()
        self.creator = make_user('cr', 'creator')
        self.buyer = make_user('by')
        self.a1 = make_asset(self.creator, 'One', price=100)
        self.a2 = make_asset(self.creator, 'Two', price=250)
        self.client.force_login(self.buyer)

    def checkout_cart(self):
        for a in (self.a1, self.a2):
            CartItem.objects.get_or_create(user=self.buyer, asset=a)
        r = self.client.post(reverse('commerce:checkout'))
        self.assertEqual(r.status_code, 302)
        return Order.objects.get()

    def test_order_totals_and_fee_split(self):
        order = self.checkout_cart()
        self.assertEqual(order.status, Order.STATUS_CREATED)
        self.assertEqual(order.subtotal, 350)
        self.assertEqual(order.total, 350)
        self.assertEqual(order.platform_fee, sum(i.price - i.creator_earning for i in order.items.all()))
        self.assertEqual(order.items.count(), 2)

    def test_successful_payment_grants_purchases_and_clears_cart(self):
        order = self.checkout_cart()
        r = self.client.post(reverse('commerce:pay_confirm', args=[order.reference]), {'outcome': 'success'})
        self.assertRedirects(r, reverse('commerce:success', args=[order.reference]))
        order.refresh_from_db()
        self.assertEqual(order.status, Order.STATUS_PAID)
        self.assertEqual(Purchase.objects.filter(user=self.buyer).count(), 2)
        self.assertEqual(CartItem.objects.filter(user=self.buyer).count(), 0)

    def test_payment_is_idempotent(self):
        order = self.checkout_cart()
        url = reverse('commerce:pay_confirm', args=[order.reference])
        self.client.post(url, {'outcome': 'success'})
        paid_at = Order.objects.get().paid_at
        self.client.post(url, {'outcome': 'success'})
        self.client.post(url, {'outcome': 'fail'})  # a late failure must not undo a paid order
        order.refresh_from_db()
        self.assertEqual(order.status, Order.STATUS_PAID)
        self.assertEqual(order.paid_at, paid_at)
        self.assertEqual(Purchase.objects.count(), 2)

    def test_failure_keeps_cart_and_can_be_retried(self):
        order = self.checkout_cart()
        url = reverse('commerce:pay_confirm', args=[order.reference])
        self.client.post(url, {'outcome': 'fail'})
        order.refresh_from_db()
        self.assertEqual(order.status, Order.STATUS_FAILED)
        self.assertEqual(Purchase.objects.count(), 0)
        self.assertEqual(CartItem.objects.filter(user=self.buyer).count(), 2)
        self.client.post(url, {'outcome': 'success'})
        order.refresh_from_db()
        self.assertEqual(order.status, Order.STATUS_PAID)
        self.assertEqual(Purchase.objects.count(), 2)

    def test_other_user_cannot_pay_or_view_order(self):
        order = self.checkout_cart()
        self.client.force_login(make_user('mallory'))
        self.assertEqual(self.client.get(reverse('commerce:pay', args=[order.reference])).status_code, 403)
        self.assertEqual(self.client.post(reverse('commerce:pay_confirm', args=[order.reference])).status_code, 403)

    def test_empty_cart_checkout_redirects_with_error(self):
        r = self.client.post(reverse('commerce:checkout'))
        self.assertRedirects(r, reverse('commerce:cart'))
        self.assertEqual(Order.objects.count(), 0)

    def test_buy_now_single_asset(self):
        r = self.client.post(reverse('commerce:checkout'), {'asset': self.a1.slug})
        order = Order.objects.get()
        self.assertRedirects(r, reverse('commerce:pay', args=[order.reference]))
        self.assertEqual(order.items.count(), 1)

    def test_services_confirm_directly_twice(self):
        order = services.create_order(self.buyer, [self.a1])
        self.assertEqual(services.confirm_payment(order, 'success'), 'paid')
        self.assertEqual(services.confirm_payment(order, 'success'), 'already_paid')


class FreeClaimTests(TempStorageTestCase):
    def test_claim_free_once(self):
        creator = make_user('cr', 'creator')
        free = make_asset(creator, 'Gratis', price=0)
        paid = make_asset(creator, 'Costly', price=50)
        buyer = make_user('by')
        self.client.force_login(buyer)
        self.client.post(reverse('commerce:claim', args=[free.slug]))
        self.client.post(reverse('commerce:claim', args=[free.slug]))
        self.assertEqual(Purchase.objects.filter(user=buyer, asset=free).count(), 1)
        self.client.post(reverse('commerce:claim', args=[paid.slug]))
        self.assertFalse(Purchase.objects.filter(user=buyer, asset=paid).exists())


class DownloadTests(TempStorageTestCase):
    def setUp(self):
        super().setUp()
        self.creator = make_user('cr', 'creator')
        self.buyer = make_user('by')
        self.stranger = make_user('st')
        self.admin = make_user('ad', 'admin')
        self.asset = make_asset(self.creator, price=100)
        Purchase.objects.create(user=self.buyer, asset=self.asset, price_paid=100)
        self.url = reverse('commerce:download', args=[self.asset.slug])

    def test_anonymous_redirected_to_login(self):
        self.assertEqual(self.client.get(self.url).status_code, 302)

    def test_stranger_forbidden(self):
        self.client.force_login(self.stranger)
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_buyer_downloads_and_counters_move(self):
        self.client.force_login(self.buyer)
        r = self.client.get(self.url)
        self.assertEqual(r.status_code, 200)
        self.assertIn('attachment', r['Content-Disposition'])
        self.assertEqual(b''.join(r.streaming_content), b'PK\x03\x04 demo file')
        self.assertEqual(Purchase.objects.get().download_count, 1)
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.downloads, 1)

    def test_creator_and_admin_can_download_without_counting(self):
        for u in (self.creator, self.admin):
            self.client.force_login(u)
            r = self.client.get(self.url)
            self.assertEqual(r.status_code, 200)
            r.close()
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.downloads, 0)

    def test_private_file_has_no_public_url(self):
        with self.assertRaises(Exception):
            self.asset.file.url


class ReceiptTests(TempStorageTestCase):
    def test_receipt_pdf_only_when_paid_and_owner(self):
        creator = make_user('cr', 'creator')
        buyer = make_user('by')
        asset = make_asset(creator, price=100)
        order = services.create_order(buyer, [asset])
        self.client.force_login(buyer)
        url = reverse('commerce:receipt', args=[order.reference])
        self.assertEqual(self.client.get(url).status_code, 404)
        services.confirm_payment(order, 'success')
        r = self.client.get(url)
        self.assertEqual(r['Content-Type'], 'application/pdf')
        self.assertTrue(r.content.startswith(b'%PDF'))
        self.client.force_login(make_user('other'))
        self.assertEqual(self.client.get(url).status_code, 403)
