from django.urls import path
from . import views
from . import eraktkosh_views

urlpatterns = [
    path('auth/register-doctor/', views.register_doctor, name='register_doctor'),
    path('auth/register-patient/', views.register_patient, name='register_patient'),
    path('auth/login/', views.login_user, name='login_user'),
    path('patients/search/', views.search_patient, name='search_patient'),
    path('records/create/', views.create_record, name='create_record'),
    path('records/timeline/', views.get_timeline, name='get_timeline'),
    path('records/doctor_logs/', views.get_doctor_logs, name='get_doctor_logs'),
    path('consent/status/', views.get_consent_status, name='get_consent_status'),
    path('consent/toggle/', views.toggle_consent, name='toggle_consent'),
    path('doctors/list/', views.list_doctors, name='list_doctors'),
    path('doctors/profile/update/', views.update_doctor_profile, name='update_doctor_profile'),
    
    # Proxy endpoint for eRaktKosh integration
    path('eraktkosh/nearby/', eraktkosh_views.get_nearby_blood_banks, name='eraktkosh_nearby'),
    
    # Appointments
    path('doctors/schedule/', views.update_doctor_schedule, name='update_doctor_schedule'),
    path('appointments/book/', views.book_appointment, name='book_appointment'),
    path('appointments/list/', views.list_appointments, name='list_appointments'),
    path('appointments/slots/', views.get_appointment_slots, name='get_appointment_slots'),
    path('appointments/update_status/', views.update_appointment_status, name='update_appointment_status'),
    path('notifications/list/', views.get_notifications, name='get_notifications'),
    path('notifications/read/', views.mark_notification_read, name='mark_notification_read'),
    path('patients/permitted/', views.get_permitted_patients, name='get_permitted_patients'),
]
