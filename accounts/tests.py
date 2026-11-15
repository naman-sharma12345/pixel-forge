from django.test import TestCase
from django.urls import reverse

from core.tests import TempStorageTestCase, make_asset, make_user

from .models import User


class RegistrationTests(TestCase):
    def post(self, **over):
        data = {'first_name': 'New Bie', 'username': 'newbie', 'email': 'newbie@example.com', 'password1': 'Str0ng!Pass99', 'password2': 'Str0ng!Pass99'}
        data.update(over)
        return self.client.post(reverse('accounts:register'), data)

    def test_register_creates_buyer_and_logs_in(self):
        r = self.post()
        self.assertEqual(r.status_code, 302)
        u = User.objects.get(username='newbie')
        self.assertEqual(u.role, 'buyer')
        self.assertEqual(int(self.client.session['_auth_user_id']), u.pk)

    def test_duplicate_email_rejected(self):
        make_user('taken')
        User.objects.filter(username='taken').update(email='newbie@example.com')
        self.assertEqual(self.post().status_code, 200)
        self.assertFalse(User.objects.filter(username='newbie').exists())

    def test_weak_password_rejected(self):
        self.assertEqual(self.post(password1='123', password2='123').status_code, 200)
        self.assertFalse(User.objects.filter(username='newbie').exists())

    def test_password_mismatch_rejected(self):
        self.assertEqual(self.post(password2='Different!Pass1').status_code, 200)
        self.assertFalse(User.objects.filter(username='newbie').exists())


class LoginTests(TestCase):
    def setUp(self):
        self.u = make_user('alice')

    def test_login_with_email_and_username(self):
        for ident in ('alice', 'alice@example.com'):
            self.client.logout()
            r = self.client.post(reverse('accounts:login'), {'username': ident, 'password': 'Password123'})
            self.assertEqual(r.status_code, 302, ident)
            self.assertIn('_auth_user_id', self.client.session)

    def test_wrong_password(self):
        r = self.client.post(reverse('accounts:login'), {'username': 'alice', 'password': 'nope'})
        self.assertEqual(r.status_code, 200)
        self.assertNotIn('_auth_user_id', self.client.session)

    def test_banned_user_cannot_login(self):
        User.objects.filter(pk=self.u.pk).update(is_active=False)
        r = self.client.post(reverse('accounts:login'), {'username': 'alice', 'password': 'Password123'})
        self.assertEqual(r.status_code, 200)
        self.assertNotIn('_auth_user_id', self.client.session)

    def test_logout_requires_post(self):
        self.client.force_login(self.u)
        self.assertEqual(self.client.get(reverse('accounts:logout')).status_code, 405)
        self.client.post(reverse('accounts:logout'))
        self.assertNotIn('_auth_user_id', self.client.session)


class RoleTests(TestCase):
    def test_become_creator(self):
        u = make_user('bob')
        self.client.force_login(u)
        self.client.post(reverse('accounts:become_creator'))
        u.refresh_from_db()
        self.assertEqual(u.role, 'creator')
        self.assertTrue(hasattr(u, 'creator_profile'))

    def test_superuser_gets_admin_role(self):
        su = User.objects.create_superuser('root', 'root@example.com', 'Password123')
        self.assertEqual(su.role, 'admin')

    def test_settings_requires_login(self):
        r = self.client.get(reverse('accounts:settings'))
        self.assertEqual(r.status_code, 302)
        self.assertIn('/accounts/login/', r['Location'])


class WishlistTests(TempStorageTestCase):
    def test_toggle_json(self):
        asset = make_asset(make_user('cr', 'creator'))
        self.client.force_login(make_user('by'))
        url = reverse('accounts:wishlist_toggle', args=[asset.slug])
        r = self.client.post(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertTrue(r.json()['in_wishlist'])
        r = self.client.post(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertFalse(r.json()['in_wishlist'])
