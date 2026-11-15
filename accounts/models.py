from django.contrib.auth.models import AbstractUser
from django.db import models
from django.urls import reverse


class User(AbstractUser):
    """Pixel Forge account. Extends Django's user with a role, bio, socials and a wishlist."""

    ROLE_BUYER = 'buyer'
    ROLE_CREATOR = 'creator'
    ROLE_ADMIN = 'admin'
    ROLE_CHOICES = [
        (ROLE_BUYER, 'Buyer'),
        (ROLE_CREATOR, 'Creator'),
        (ROLE_ADMIN, 'Admin'),
    ]

    email = models.EmailField('email address', unique=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=ROLE_BUYER, db_index=True)
    bio = models.CharField(max_length=300, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True)
    website = models.URLField(blank=True)
    twitter = models.CharField(max_length=60, blank=True)
    itchio = models.CharField(max_length=120, blank=True)
    github = models.CharField(max_length=60, blank=True)
    # many-to-many: a user can wishlist many assets; an asset can be wishlisted by many users
    wishlist = models.ManyToManyField('catalog.Asset', related_name='wishlisted_by', blank=True)

    REQUIRED_FIELDS = ['email']

    class Meta:
        ordering = ['-date_joined']

    def __str__(self):
        return f'@{self.username}'

    def save(self, *args, **kwargs):
        # superusers are always admins in the product's own role system
        if self.is_superuser and self.role != self.ROLE_ADMIN:
            self.role = self.ROLE_ADMIN
        if self.email:
            self.email = self.email.lower()
        super().save(*args, **kwargs)

    @property
    def display_name(self):
        return self.first_name.strip() or self.username

    @property
    def is_creator(self):
        return self.role in (self.ROLE_CREATOR, self.ROLE_ADMIN)

    @property
    def is_admin_role(self):
        return self.role == self.ROLE_ADMIN

    @property
    def is_banned(self):
        return not self.is_active

    @property
    def avatar_url(self):
        if self.avatar:
            return self.avatar.url
        return reverse('core:avatar', args=[self.username])

    def get_absolute_url(self):
        return reverse('accounts:profile', args=[self.username])


class CreatorProfile(models.Model):
    """One-to-one extension created the moment a buyer becomes a creator."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='creator_profile')
    tagline = models.CharField(max_length=120, blank=True)
    banner_seed = models.CharField(max_length=60, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Creator profile of {self.user}'

    def save(self, *args, **kwargs):
        if not self.banner_seed:
            self.banner_seed = self.user.username
        super().save(*args, **kwargs)
