from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path('search/', views.search_assets, name='search_assets'),
    path('trigger/', views.trigger_notifications, name='trigger_notifications'),
]
