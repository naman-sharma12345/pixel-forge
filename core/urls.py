from django.urls import path

from . import views

app_name = 'core'
urlpatterns = [
    path('', views.home, name='home'),
    path('avatar/<str:username>.png', views.avatar, name='avatar'),
    path('illustration/<slug:kind>.png', views.illustration, name='illustration'),
    path('sheet/<str:seed>.png', views.sheet, name='sheet'),
    path('art/<slug:key>.png', views.category_art, name='category_art'),
    path('banner/<str:seed>.png', views.banner, name='banner'),
]
