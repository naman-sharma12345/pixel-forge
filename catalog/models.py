import os
import secrets
import string

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.storage import FileSystemStorage
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Avg, Count, Q
from django.urls import reverse
from django.utils import timezone
from django.utils.text import slugify


class PrivateFileStorage(FileSystemStorage):
    """Storage rooted at PRIVATE_FILES_ROOT. It has no URL: files are only reachable
    through the permission-checked download view."""

    @property
    def base_location(self):  # read lazily so tests can point it at a temp folder
        return str(settings.PRIVATE_FILES_ROOT)

    @property
    def location(self):
        return os.path.abspath(self.base_location)

    def url(self, name):
        raise ValueError('Private files have no public URL. Use the download view.')


def get_private_storage():
    return PrivateFileStorage()


class Category(models.Model):
    MEDIA_IMAGE, MEDIA_AUDIO, MEDIA_OTHER = 'image', 'audio', 'other'
    MEDIA_CHOICES = [(MEDIA_IMAGE, 'Image'), (MEDIA_AUDIO, 'Audio'), (MEDIA_OTHER, 'Other')]

    key = models.SlugField(unique=True)
    name = models.CharField(max_length=40)
    media_kind = models.CharField(max_length=5, choices=MEDIA_CHOICES, default=MEDIA_IMAGE)
    icon = models.CharField(max_length=40, default='sparkles', help_text='Lucide icon name')
    description = models.CharField(max_length=160, blank=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order']
        verbose_name_plural = 'categories'

    def __str__(self):
        return self.name


class Tag(models.Model):
    name = models.CharField(max_length=24, unique=True)
    slug = models.SlugField(max_length=40, unique=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'#{self.name}'

    def save(self, *args, **kwargs):
        self.name = self.name.strip().lower()
        if not self.slug:
            self.slug = slugify(self.name) or 'tag'
        super().save(*args, **kwargs)


class AssetQuerySet(models.QuerySet):
    def published(self):
        return self.filter(status=Asset.STATUS_PUBLISHED)

    def with_stats(self):
        """Annotate sales, rating average and review count in one query."""
        return self.annotate(
            n_sales=Count('purchases', distinct=True),
            n_reviews=Count('reviews', distinct=True),
            avg_rating=Avg('reviews__rating'),
            n_wishlists=Count('wishlisted_by', distinct=True),
        )

    def for_cards(self):
        """Everything an asset card needs, without N+1 queries."""
        return (
            self.select_related('creator', 'category')
            .prefetch_related('previews')
            .with_stats()
        )

    def search(self, q):
        """title / description / tag name, icontains. Tags use a subquery so aggregates are not multiplied by joins."""
        q = (q or '').strip()
        if not q:
            return self
        tagged = Asset.tags.through.objects.filter(tag__name__icontains=q).values('asset_id')
        return self.filter(Q(title__icontains=q) | Q(description__icontains=q) | Q(pk__in=tagged))

    def with_tags(self, names):
        """Assets that carry ALL the given tags."""
        qs = self
        for name in names:
            qs = qs.filter(pk__in=Asset.tags.through.objects.filter(tag__name=name).values('asset_id'))
        return qs


class Asset(models.Model):
    LICENSE_CC0, LICENSE_STANDARD, LICENSE_EXTENDED = 'cc0', 'standard', 'extended'
    LICENSE_CHOICES = [
        (LICENSE_CC0, 'CC0 - Public domain'),
        (LICENSE_STANDARD, 'Standard - Commercial use in games, no resale'),
        (LICENSE_EXTENDED, 'Extended - Commercial use plus redistribution'),
    ]
    STATUS_PUBLISHED, STATUS_REJECTED, STATUS_ARCHIVED = 'published', 'rejected', 'archived'
    STATUS_CHOICES = [
        (STATUS_PUBLISHED, 'Published'),
        (STATUS_REJECTED, 'Rejected'),
        (STATUS_ARCHIVED, 'Archived'),
    ]

    # one-to-many: a creator has many assets
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assets')
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='assets')
    # many-to-many
    tags = models.ManyToManyField(Tag, blank=True, related_name='assets')

    title = models.CharField(max_length=80)
    slug = models.SlugField(max_length=100, unique=True, editable=False)
    description = models.TextField()
    price = models.PositiveIntegerField(
        default=0, validators=[MaxValueValidator(50000)], help_text='Whole rupees. 0 means free.'
    )
    license = models.CharField(max_length=10, choices=LICENSE_CHOICES, default=LICENSE_STANDARD)
    thumbnail = models.ImageField(upload_to='thumbnails/')
    file = models.FileField(storage=get_private_storage, upload_to='files/')
    file_formats = models.CharField(max_length=120, blank=True, help_text='Comma-separated, e.g. png,aseprite')

    resolution = models.CharField(max_length=20, blank=True)
    frames = models.PositiveIntegerField(null=True, blank=True)
    duration_sec = models.FloatField(null=True, blank=True)
    bpm = models.PositiveIntegerField(null=True, blank=True)
    loopable = models.BooleanField(default=False)

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PUBLISHED)
    rejection_reason = models.CharField(max_length=300, blank=True)
    is_featured = models.BooleanField(default=False)
    views = models.PositiveIntegerField(default=0)
    downloads = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    objects = AssetQuerySet.as_manager()

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'category'], name='asset_status_category_idx'),
            models.Index(fields=['price'], name='asset_price_idx'),
            models.Index(fields=['-created_at'], name='asset_created_idx'),
        ]

    def __str__(self):
        return self.title

    def clean(self):
        errors = {}
        if self.title and not 3 <= len(self.title.strip()) <= 80:
            errors['title'] = 'Title must be 3 to 80 characters.'
        if self.description is not None and not 20 <= len(self.description.strip()) <= 5000:
            errors['description'] = 'Description must be 20 to 5000 characters.'
        if self.frames is not None and self.frames < 1:
            errors['frames'] = 'Frames must be at least 1.'
        if self.status != self.STATUS_REJECTED and self.rejection_reason:
            self.rejection_reason = ''
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)[:60] or 'asset'
            alphabet = string.ascii_lowercase + string.digits
            while True:
                candidate = f'{base}-{"".join(secrets.choice(alphabet) for _ in range(6))}'
                if not Asset.objects.filter(slug=candidate).exists():
                    self.slug = candidate
                    break
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return reverse('catalog:detail', args=[self.slug])

    # ----- derived properties -----
    @property
    def is_free(self):
        return self.price == 0

    @property
    def media_kind(self):
        return self.category.media_kind

    @property
    def tag_list(self):
        return [t.name for t in self.tags.all()]

    @property
    def format_list(self):
        return [f.strip() for f in self.file_formats.split(',') if f.strip()]

    @property
    def file_name(self):
        return os.path.basename(self.file.name) if self.file else ''

    @property
    def file_ext(self):
        return os.path.splitext(self.file.name)[1].lstrip('.').lower() if self.file else ''

    @property
    def file_size(self):
        try:
            return self.file.size if self.file else 0
        except (OSError, ValueError):
            return 0

    @property
    def audio_preview_url(self):
        for p in self.previews.all():
            if p.kind == AssetPreview.KIND_AUDIO:
                return p.file.url
        return ''

    @property
    def image_previews(self):
        return [p for p in self.previews.all() if p.kind == AssetPreview.KIND_IMAGE]

    @property
    def audio_previews(self):
        return [p for p in self.previews.all() if p.kind == AssetPreview.KIND_AUDIO]

    @property
    def sales(self):
        return getattr(self, 'n_sales', None) if hasattr(self, 'n_sales') else self.purchases.count()

    @property
    def rating(self):
        if hasattr(self, 'avg_rating'):
            return round(self.avg_rating or 0, 1)
        return round(self.reviews.aggregate(a=Avg('rating'))['a'] or 0, 1)

    @property
    def review_count(self):
        return self.n_reviews if hasattr(self, 'n_reviews') else self.reviews.count()


class AssetPreview(models.Model):
    KIND_IMAGE, KIND_AUDIO = 'image', 'audio'
    KIND_CHOICES = [(KIND_IMAGE, 'Image'), (KIND_AUDIO, 'Audio')]

    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='previews')
    file = models.FileField(upload_to='previews/')
    kind = models.CharField(max_length=5, choices=KIND_CHOICES, default=KIND_IMAGE)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f'{self.asset.title} preview {self.order + 1} ({self.kind})'

    def clean(self):
        if self.asset_id and self.asset.previews.exclude(pk=self.pk).count() >= 6:
            raise ValidationError('An asset can have at most 6 previews.')


class Review(models.Model):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews')
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.CharField(max_length=1000, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [models.UniqueConstraint(fields=['asset', 'user'], name='one_review_per_user_per_asset')]

    def __str__(self):
        return f'{self.rating}★ by {self.user} on {self.asset}'

    def clean(self):
        if self.asset_id and self.user_id and self.asset.creator_id == self.user_id:
            raise ValidationError('You cannot review your own asset.')
