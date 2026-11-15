from django.contrib.auth.views import LogoutView
from django.urls import path

from . import views

app_name = 'accounts'
urlpatterns = [
    path('accounts/register/', views.register, name='register'),
    path('accounts/login/', views.PixelLoginView.as_view(), name='login'),
    path('accounts/logout/', LogoutView.as_view(), name='logout'),
    path('settings/', views.settings_view, name='settings'),
    path('settings/become-creator/', views.become_creator, name='become_creator'),
    path('wishlist/', views.wishlist, name='wishlist'),
    path('wishlist/toggle/<slug:slug>/', views.wishlist_toggle, name='wishlist_toggle'),
    path('u/<str:username>/', views.profile, name='profile'),
]
