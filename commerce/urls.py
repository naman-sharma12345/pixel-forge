from django.urls import path

from . import views

app_name = 'commerce'
urlpatterns = [
    path('cart/', views.cart, name='cart'),
    path('cart/add/<slug:slug>/', views.cart_add, name='cart_add'),
    path('cart/remove/<slug:slug>/', views.cart_remove, name='cart_remove'),
    path('cart/clear/', views.cart_clear, name='cart_clear'),
    path('checkout/', views.checkout, name='checkout'),
    path('checkout/pay/<str:reference>/', views.pay, name='pay'),
    path('checkout/pay/<str:reference>/confirm/', views.pay_confirm, name='pay_confirm'),
    path('checkout/success/<str:reference>/', views.success, name='success'),
    path('claim/<slug:slug>/', views.claim, name='claim'),
    path('library/', views.library, name='library'),
    path('download/<slug:slug>/', views.download, name='download'),
    path('orders/<str:reference>/receipt.pdf', views.receipt_pdf, name='receipt'),
]
