# myapp/urls.py

from django.urls import path
from . import views

urlpatterns = [
    path('hello/', views.hello_world, name='hello_world'),

    # Auth URLs
    path('auth/login/', views.login_view, name='login'),
    path('auth/me/', views.me_view, name='me'),
    path('auth/register/', views.register_view, name='register'),

    # Meal and Menu URLs
    path('meals/', views.meals_list_create_view, name='meals_list_create'),
    path('daily-menu/', views.daily_menu_view, name='daily_menu_create'),
    path('daily-menu/today/menu/', views.daily_menu_view, name='daily_menu_today'), # For GET today's menu

    # Order and Payment URLs
    path('orders/', views.orders_list_create_view, name='orders_list_create'),
    path('orders/today/revenue/', views.daily_revenue_view, name='daily_revenue'),
    path('payment/mpesa/', views.mpesa_payment_view, name='mpesa_payment'),
]