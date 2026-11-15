import csv

from django.contrib import admin
from django.http import HttpResponse


@admin.action(description='Export selected rows to CSV')
def export_csv(modeladmin, request, queryset):
    """Generic admin action: one CSV row per selected object, columns from list_display."""
    fields = [f for f in modeladmin.list_display if f != '__str__']
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{modeladmin.model._meta.model_name}s.csv"'
    writer = csv.writer(response)
    writer.writerow(fields)
    for obj in queryset:
        row = []
        for name in fields:
            value = getattr(obj, name, None)
            if value is None and callable(getattr(modeladmin, name, None)):
                value = getattr(modeladmin, name)(obj)
            elif callable(value):
                value = value()
            row.append('' if value is None else value)
        writer.writerow(row)
    return response
