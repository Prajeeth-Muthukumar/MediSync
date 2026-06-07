@echo off
echo ====================================================
echo Starting CareSync Unified Platform
echo ====================================================

echo.
echo [1/3] Starting Django Backend Server...
start "CareSync Backend API" cmd /k ".\venv\Scripts\activate && python manage.py runserver"

echo [2/3] Starting Celery Background Worker...
start "CareSync Celery Worker" cmd /k ".\venv\Scripts\activate && celery -A caresync_core worker -l info --pool=solo"

echo [3/3] Starting Vite React Frontend...
start "CareSync Frontend UI" cmd /k "cd frontend && npm run dev"

echo.
echo All services have been launched in separate windows!
echo.
echo - React Frontend (UI):   http://localhost:5173
echo - Django Backend (API):  http://127.0.0.1:8000
echo.
echo Keep the new windows open while you are working.
echo You can close this window now.
pause
