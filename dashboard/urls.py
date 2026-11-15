from django.urls import path

from . import views

app_name = 'dashboard'
urlpatterns = [
    path('studio/', views.studio_overview, name='studio'),
    path('studio/sales/', views.studio_sales, name='studio_sales'),
    path('studio/sales.csv', views.sales_csv, name='sales_csv'),
    path('studio/sales.pdf', views.sales_pdf, name='sales_pdf'),
    path('panel/', views.admin_overview, name='admin'),
    path('panel/users/', views.admin_users, name='admin_users'),
    path('panel/users/<int:pk>/ban/', views.admin_ban, name='admin_ban'),
    path('panel/users/<int:pk>/role/', views.admin_role, name='admin_role'),
    path('panel/assets/', views.admin_assets, name='admin_assets'),
    path('panel/assets/<int:pk>/moderate/', views.admin_moderate, name='admin_moderate'),
    path('panel/orders.csv', views.orders_csv, name='orders_csv'),
    path('panel/summary.pdf', views.summary_pdf, name='summary_pdf'),
]
