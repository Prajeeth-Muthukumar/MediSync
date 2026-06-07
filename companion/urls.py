from django.urls import path
from . import views

urlpatterns = [
    # Dashboards
    path('', views.patient_dashboard, name='home'),
    path('doctor/', views.doctor_dashboard, name='doctor_dashboard'),
    path('patient/', views.patient_dashboard, name='patient_dashboard'),
    
    # Prescription & Reminders Actions
    path('doctor/rx/save/', views.save_prescription, name='save_prescription'),
    path('patient/take/<str:reminder_id>/', views.confirm_medication_taken, name='confirm_taken'),
    path('patient/miss/<str:reminder_id>/', views.confirm_medication_missed, name='confirm_missed'),
    
    # Pharmacy & Affiliate Shopping
    path('pharmacy/', views.pharmacy_affiliates, name='pharmacy_affiliates'),
    
    # API endpoints
    path('api/parse-frequency/', views.api_parse_frequency, name='api_parse_frequency'),
    path('api/notification-logs/', views.api_notification_logs, name='api_notification_logs'),
]
