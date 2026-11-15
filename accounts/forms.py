import re

from django import forms
from django.contrib.auth import authenticate
from django.contrib.auth.forms import AuthenticationForm, PasswordChangeForm, UserCreationForm
from django.core.exceptions import ValidationError

from .models import User

USERNAME_RE = re.compile(r'^[a-z0-9_]{3,20}$')
AVATAR_MAX_BYTES = 2 * 1024 * 1024


def _style(form, placeholders=None):
    """Give every widget the design-system classes."""
    placeholders = placeholders or {}
    for name, field in form.fields.items():
        w = field.widget
        if isinstance(w, forms.CheckboxInput):
            continue
        css = 'textarea' if isinstance(w, forms.Textarea) else 'select' if isinstance(w, forms.Select) else 'input'
        w.attrs['class'] = f'{w.attrs.get("class", "")} {css}'.strip()
        if name in placeholders:
            w.attrs['placeholder'] = placeholders[name]


def validate_username(value, exclude_pk=None):
    value = (value or '').strip()
    if not USERNAME_RE.match(value):
        raise ValidationError('Use 3 to 20 characters: lowercase letters, numbers and underscores.')
    qs = User.objects.filter(username__iexact=value)
    if exclude_pk:
        qs = qs.exclude(pk=exclude_pk)
    if qs.exists():
        raise ValidationError('That username is taken.')
    return value


class RegisterForm(UserCreationForm):
    first_name = forms.CharField(label='Display name', min_length=2, max_length=50)
    email = forms.EmailField(label='Email')

    class Meta:
        model = User
        fields = ('first_name', 'username', 'email')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'].help_text = 'Lowercase letters, numbers and underscores, 3 to 20 characters.'
        self.fields['password1'].label = 'Password'
        self.fields['password2'].label = 'Confirm password'
        self.fields['password1'].help_text = '8+ characters. Avoid common or all-numeric passwords.'
        self.fields['password2'].help_text = ''
        _style(self, {'first_name': 'Mira Pixel', 'username': 'pixel_pioneer', 'email': 'you@studio.dev'})
        self.fields['first_name'].widget.attrs.update(autocomplete='name', autofocus=True)
        self.fields['username'].widget.attrs.update(autocomplete='username', maxlength=20)
        self.fields['password1'].widget.attrs.update(autocomplete='new-password')
        self.fields['password2'].widget.attrs.update(autocomplete='new-password')

    def clean_username(self):
        return validate_username(self.cleaned_data.get('username')).lower()

    def clean_email(self):
        email = self.cleaned_data['email'].strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise ValidationError('That email is already registered.')
        return email

    def clean_first_name(self):
        return self.cleaned_data['first_name'].strip()


class LoginForm(AuthenticationForm):
    """Log in with an email address or a username."""

    username = forms.CharField(label='Email or username', widget=forms.TextInput(attrs={'autofocus': True, 'autocomplete': 'username'}))
    error_messages = {
        'invalid_login': 'That email/username and password don’t match. Check both and try again.',
        'inactive': 'This account has been banned.',
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        _style(self)
        self.fields['password'].widget.attrs.update(autocomplete='current-password')

    def clean(self):
        identifier = (self.cleaned_data.get('username') or '').strip()
        password = self.cleaned_data.get('password')
        if identifier and password:
            user = User.objects.filter(email__iexact=identifier).first() if '@' in identifier else User.objects.filter(username__iexact=identifier).first()
            if user and not user.is_active and user.check_password(password):
                raise ValidationError(self.error_messages['inactive'], code='inactive')
            self.user_cache = authenticate(self.request, username=user.username if user else identifier, password=password)
            if self.user_cache is None:
                raise ValidationError(self.error_messages['invalid_login'], code='invalid_login')
            self.confirm_login_allowed(self.user_cache)
        return self.cleaned_data


class ProfileForm(forms.ModelForm):
    first_name = forms.CharField(label='Display name', min_length=2, max_length=50)

    class Meta:
        model = User
        fields = ('first_name', 'username', 'bio', 'website', 'twitter', 'itchio', 'github', 'avatar')
        widgets = {'bio': forms.Textarea(attrs={'rows': 4, 'maxlength': 300}), 'avatar': forms.FileInput(attrs={'accept': 'image/*', 'data-preview': 'avatar-preview'})}
        labels = {'twitter': 'Twitter / X', 'itchio': 'itch.io'}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        _style(self, {'website': 'https://…', 'twitter': '@handle', 'itchio': 'your-page.itch.io', 'github': 'username'})
        self.fields['avatar'].widget.attrs['class'] = ''
        self.fields['avatar'].required = False

    def clean_username(self):
        return validate_username(self.cleaned_data.get('username'), exclude_pk=self.instance.pk).lower()

    def clean_avatar(self):
        avatar = self.cleaned_data.get('avatar')
        if avatar and hasattr(avatar, 'size'):
            if avatar.size > AVATAR_MAX_BYTES:
                raise ValidationError('Avatar must be under 2 MB.')
            content_type = getattr(avatar, 'content_type', '') or ''
            if content_type and not content_type.startswith('image/'):
                raise ValidationError('Avatar must be an image.')
        return avatar


class StyledPasswordChangeForm(PasswordChangeForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        _style(self)
        self.fields['old_password'].widget.attrs.pop('autofocus', None)
        self.fields['new_password1'].label = 'New password'
        self.fields['new_password2'].label = 'Confirm new password'
