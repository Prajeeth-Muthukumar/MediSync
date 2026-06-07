from django.apps import AppConfig


class CompanionConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'companion'

    def ready(self):
        # Prevent starting the background scheduler worker thread twice during development auto-reload
        import os
        if os.environ.get('RUN_MAIN') == 'true' or not os.environ.get('DJANGO_SETTINGS_MODULE'):
            from companion import worker
            worker.start_worker()
