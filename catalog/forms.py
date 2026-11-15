import os

from django import forms
from django.conf import settings
from django.core.exceptions import ValidationError

from .models import Asset, AssetPreview, Category, Review, Tag

# Same lists as the legacy server/src/middleware/upload.js
IMAGE_EXTS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}
AUDIO_EXTS = {'mp3', 'wav', 'ogg', 'webm', 'flac'}
PREVIEW_EXTS = IMAGE_EXTS | {'mp3', 'wav', 'ogg', 'webm'}
PRODUCT_EXTS = {
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'psd', 'aseprite', 'ase', 'zip', '7z', 'rar', 'wav', 'mp3', 'ogg',
    'flac', 'ttf', 'otf', 'woff', 'woff2', 'glb', 'gltf', 'fbx', 'obj', 'blend', 'tmx', 'tsx', 'json', 'txt', 'pdf',
}
MAX_PREVIEWS = 6


def ext_of(name):
    return os.path.splitext(name or '')[1].lstrip('.').lower()


def check_size(f):
    if f.size > settings.MAX_UPLOAD_BYTES:
        raise ValidationError(f'“{f.name}” is {f.size / 1024 / 1024:.1f} MB. The limit is 25 MB per file.')


SORT_CHOICES = [
    ('newest', 'Newest'), ('popular', 'Most popular'), ('top-rated', 'Top rated'),
    ('price-asc', 'Price: low to high'), ('price-desc', 'Price: high to low'),
]


class ExploreForm(forms.Form):
    """Read from request.GET. Every filter stays in the URL."""

    q = forms.CharField(required=False, max_length=100)
    category = forms.ModelChoiceField(Category.objects.all(), to_field_name='key', required=False, empty_label=None)
    tags = forms.CharField(required=False, max_length=300)
    min_price = forms.IntegerField(required=False, min_value=0, max_value=50000)
    max_price = forms.IntegerField(required=False, min_value=0, max_value=50000)
    free = forms.BooleanField(required=False)
    license = forms.ChoiceField(required=False, choices=[('', 'Any license')] + Asset.LICENSE_CHOICES)
    media_kind = forms.ChoiceField(required=False, choices=[('', 'All'), ('image', 'Images'), ('audio', 'Audio'), ('other', 'Other')])
    sort = forms.ChoiceField(required=False, choices=SORT_CHOICES + [('relevance', 'Best match')])

    def clean_tags(self):
        return [t.strip().lower() for t in self.cleaned_data.get('tags', '').split(',') if t.strip()][:10]

    def clean(self):
        data = super().clean()
        lo, hi = data.get('min_price'), data.get('max_price')
        if lo is not None and hi is not None and lo > hi:
            data['min_price'], data['max_price'] = hi, lo
        if data.get('sort') == 'relevance' and not data.get('q'):
            data['sort'] = 'newest'
        return data


class ReviewForm(forms.ModelForm):
    rating = forms.TypedChoiceField(choices=[(5, '5'), (4, '4'), (3, '3'), (2, '2'), (1, '1')], coerce=int, widget=forms.RadioSelect, error_messages={'required': 'Pick a star rating.'})

    class Meta:
        model = Review
        fields = ('rating', 'comment')
        widgets = {'comment': forms.Textarea(attrs={'class': 'textarea', 'rows': 4, 'maxlength': 1000, 'placeholder': 'What did you think?'})}
        labels = {'comment': 'Comment (optional)'}


class MultipleFileInput(forms.ClearableFileInput):
    allow_multiple_selected = True


class MultipleFileField(forms.FileField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault('widget', MultipleFileInput())
        super().__init__(*args, **kwargs)

    def clean(self, data, initial=None):
        single = super().clean
        if isinstance(data, (list, tuple)):
            return [single(d, initial) for d in data if d]
        return [single(data, initial)] if data else []


class AssetForm(forms.ModelForm):
    """Creator Studio upload / edit form (multipart)."""

    category = forms.ModelChoiceField(Category.objects.all(), empty_label=None, widget=forms.RadioSelect)
    tag_list = forms.CharField(label='Tags', required=False, max_length=400, help_text='Comma-separated, up to 10 tags of 24 characters or fewer.')
    previews = MultipleFileField(required=False, label='Previews', help_text='Up to 6 images or audio files (PNG, JPG, WebP, GIF, MP3, WAV, OGG, WebM). New previews replace the old ones.')

    class Meta:
        model = Asset
        fields = ('title', 'category', 'description', 'thumbnail', 'file', 'file_formats', 'resolution', 'frames', 'duration_sec', 'bpm', 'loopable', 'price', 'license')
        widgets = {
            'title': forms.TextInput(attrs={'maxlength': 80, 'placeholder': 'e.g. Pixel Dungeon Tileset 16×16'}),
            'description': forms.Textarea(attrs={'rows': 7, 'maxlength': 5000, 'placeholder': 'What is in the pack, sizes, engine notes. Line breaks and links are kept.'}),
            'thumbnail': forms.FileInput(attrs={'accept': 'image/png,image/jpeg,image/webp,image/gif'}),
            'file': forms.FileInput(),
            'file_formats': forms.TextInput(attrs={'placeholder': 'png, aseprite, wav'}),
            'resolution': forms.TextInput(attrs={'placeholder': '16x16'}),
            'price': forms.NumberInput(attrs={'min': 0, 'max': 50000, 'step': 1, 'inputmode': 'numeric'}),
            'license': forms.RadioSelect,
        }
        labels = {'file': 'Main file (the download buyers get)', 'file_formats': 'File formats', 'duration_sec': 'Duration (seconds)', 'bpm': 'BPM', 'loopable': 'Loops seamlessly', 'price': 'Price in rupees (0 = free)'}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        editing = bool(self.instance.pk)
        self.fields['thumbnail'].required = not editing
        self.fields['file'].required = not editing
        self.fields['license'].choices = Asset.LICENSE_CHOICES
        for name, field in self.fields.items():
            w = field.widget
            if isinstance(w, (forms.RadioSelect, forms.CheckboxInput, forms.FileInput, forms.ClearableFileInput)):
                continue
            w.attrs['class'] = f'{w.attrs.get("class", "")} {"textarea" if isinstance(w, forms.Textarea) else "input"}'.strip()
        if editing:
            self.fields['tag_list'].initial = ', '.join(t.name for t in self.instance.tags.all())

    # ----- field validation -----
    def clean_title(self):
        t = self.cleaned_data['title'].strip()
        if not 3 <= len(t) <= 80:
            raise ValidationError('Title must be 3 to 80 characters.')
        return t

    def clean_description(self):
        d = self.cleaned_data['description'].strip()
        if not 20 <= len(d) <= 5000:
            raise ValidationError('Description must be 20 to 5000 characters.')
        return d

    def clean_thumbnail(self):
        f = self.cleaned_data.get('thumbnail')
        if f and hasattr(f, 'size') and not getattr(f, '_committed', False):
            if ext_of(f.name) not in IMAGE_EXTS:
                raise ValidationError('The thumbnail must be a PNG, JPG, WebP or GIF image.')
            check_size(f)
        return f

    def clean_file(self):
        f = self.cleaned_data.get('file')
        if f and hasattr(f, 'size') and not getattr(f, '_committed', False):
            ext = ext_of(f.name)
            if ext not in PRODUCT_EXTS:
                raise ValidationError(f'.{ext or "?"} files can’t be sold here. Allowed: ' + ' '.join(f'.{e}' for e in sorted(PRODUCT_EXTS)) + '. Tip: put anything else inside a .zip.')
            check_size(f)
        return f

    def clean_price(self):
        p = self.cleaned_data.get('price')
        if p is None or not 0 <= p <= 50000:
            raise ValidationError('Price must be a whole number of rupees from 0 to 50,000.')
        return p

    def clean_tag_list(self):
        names = []
        for raw in self.cleaned_data.get('tag_list', '').split(','):
            t = raw.strip().lower().lstrip('#')
            if t and t not in names:
                names.append(t)
        if len(names) > 10:
            raise ValidationError('Use at most 10 tags.')
        if any(len(t) > 24 for t in names):
            raise ValidationError('Each tag must be 24 characters or fewer.')
        return names

    def clean_file_formats(self):
        formats = [f.strip().lower().lstrip('.') for f in self.cleaned_data.get('file_formats', '').split(',') if f.strip()]
        return ','.join(dict.fromkeys(formats))

    def clean_previews(self):
        files = self.cleaned_data.get('previews') or []
        if len(files) > MAX_PREVIEWS:
            raise ValidationError(f'Up to {MAX_PREVIEWS} previews are allowed.')
        for f in files:
            if ext_of(f.name) not in PREVIEW_EXTS:
                raise ValidationError(f'“{f.name}” isn’t supported. Previews can be PNG, JPG, WebP, GIF, MP3, WAV, OGG or WebM.')
            check_size(f)
        return files

    def clean(self):
        data = super().clean()
        category = data.get('category')
        if category and category.media_kind == Category.MEDIA_AUDIO and 'previews' not in self.errors:
            new_previews = data.get('previews') or []
            has_new_audio = any(ext_of(f.name) in AUDIO_EXTS for f in new_previews)
            keeps_old = self.instance.pk and not new_previews and self.instance.previews.filter(kind=AssetPreview.KIND_AUDIO).exists()
            main = data.get('file')
            main_ext = ext_of(main.name) if main and hasattr(main, 'name') else (ext_of(self.instance.file.name) if self.instance.pk else '')
            if not (has_new_audio or keeps_old or main_ext in AUDIO_EXTS):
                self.add_error('previews', 'Audio assets need an audio preview. Add one, or upload an audio file (WAV, MP3, OGG) as the main file and it will be used as the preview.')
        if data.get('frames') is not None and data['frames'] < 1:
            self.add_error('frames', 'Frames must be at least 1.')
        return data

    def save(self, commit=True):
        asset = super().save(commit=False)
        if not asset.file_formats and self.cleaned_data.get('file'):
            asset.file_formats = ext_of(self.cleaned_data['file'].name)
        category = self.cleaned_data['category']
        if category.media_kind != Category.MEDIA_IMAGE:
            asset.resolution, asset.frames = (asset.resolution if category.key == '3d' else ''), None
        if category.media_kind != Category.MEDIA_AUDIO:
            asset.duration_sec, asset.bpm, asset.loopable = None, None, False
        asset.save()
        from django.core.files.base import ContentFile
        tags = [Tag.objects.get_or_create(name=n, defaults={'slug': n.replace(' ', '-')[:40] or 'tag'})[0] for n in self.cleaned_data['tag_list']]
        asset.tags.set(tags)
        new_previews = self.cleaned_data.get('previews') or []
        main = self.cleaned_data.get('file')
        if new_previews:
            for old in asset.previews.all():
                old.file.delete(save=False)
                old.delete()
            for i, f in enumerate(new_previews):
                p = AssetPreview(asset=asset, order=i, kind=AssetPreview.KIND_AUDIO if ext_of(f.name) in AUDIO_EXTS else AssetPreview.KIND_IMAGE)
                p.file.save(f.name, f, save=False)
                p.save()
        elif not asset.previews.exists():
            if category.media_kind == Category.MEDIA_AUDIO and main is not None and ext_of(main.name) in AUDIO_EXTS:
                main.seek(0)
                p = AssetPreview(asset=asset, order=0, kind=AssetPreview.KIND_AUDIO)
                p.file.save(f'preview-{os.path.basename(main.name)}', ContentFile(main.read()), save=False)
                p.save()
            else:
                asset.thumbnail.open('rb')
                p = AssetPreview(asset=asset, order=0, kind=AssetPreview.KIND_IMAGE)
                p.file.save(f'preview-{os.path.basename(asset.thumbnail.name)}', ContentFile(asset.thumbnail.read()), save=False)
                asset.thumbnail.close()
                p.save()
        return asset
