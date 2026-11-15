from django import forms

from accounts.models import User


class DateRangeForm(forms.Form):
    start = forms.DateField(required=False, widget=forms.DateInput(attrs={'type': 'date', 'class': 'input'}))
    end = forms.DateField(required=False, widget=forms.DateInput(attrs={'type': 'date', 'class': 'input'}))

    def clean(self):
        data = super().clean()
        if data.get('start') and data.get('end') and data['start'] > data['end']:
            data['start'], data['end'] = data['end'], data['start']
        return data


class UserFilterForm(forms.Form):
    q = forms.CharField(required=False, max_length=80)
    role = forms.ChoiceField(required=False, choices=[('', 'All roles')] + User.ROLE_CHOICES)
    banned = forms.ChoiceField(required=False, choices=[('', 'Any status'), ('false', 'Active'), ('true', 'Banned')])


class RejectForm(forms.Form):
    reason = forms.CharField(min_length=5, max_length=300, widget=forms.Textarea(attrs={'rows': 3, 'class': 'textarea', 'maxlength': 300}),
                             error_messages={'required': 'Give the creator a reason (at least 5 characters).'})


class RoleForm(forms.Form):
    role = forms.ChoiceField(choices=User.ROLE_CHOICES)
