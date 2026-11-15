"""Root URL configuration. Each app owns its URLs and has its own namespace."""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('core.urls')),
    path('', include('accounts.urls')),
    path('', include('catalog.urls')),
    path('', include('commerce.urls')),
    path('', include('dashboard.urls')),
]

handler403 = 'core.views.handler403'
handler404 = 'core.views.handler404'
handler500 = 'core.views.handler500'

if settings.DEBUG:
    # Only public uploads are served. private_files/ has no URL at all.
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
