from django.urls import path

from . import views

app_name = 'catalog'
urlpatterns = [
    path('explore/', views.explore, name='explore'),
    path('explore/export.csv', views.explore_csv, name='explore_csv'),
    path('category/<slug:key>/', views.category_redirect, name='category'),
    path('api/search/', views.api_search, name='api_search'),
    path('asset/<slug:slug>/', views.asset_detail, name='detail'),
    path('asset/<slug:slug>/review/', views.review_save, name='review_save'),
    path('review/<int:pk>/delete/', views.review_delete, name='review_delete'),
    path('studio/assets/', views.studio_assets, name='studio_assets'),
    path('studio/new/', views.studio_new, name='studio_new'),
    path('studio/edit/<int:pk>/', views.studio_edit, name='studio_edit'),
    path('studio/archive/<int:pk>/', views.studio_archive, name='studio_archive'),
]
