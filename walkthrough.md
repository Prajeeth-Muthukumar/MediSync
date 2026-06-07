# CareSync Integrated Project Walkthrough

I have successfully combined the disjointed healthcare features into a single, cohesive Django project. Below is a walkthrough of what was accomplished and how to interact with the new unified system.

## Architectural Consolidation

- **Unified Project Structure**: The project now lives in the `caresync_integrated/` directory, utilizing standard Django conventions. The different features (records, donors, companions, AI) are seamlessly integrated as standard Django apps under one roof.
- **Unified Data Layer**: A singleton MongoDB client (`caresync_core/mongodb.py`) serves as the central nervous system for the platform. All features use this single connection point for data access, resolving previous conflicts caused by duplicate connection logic.
- **Dependency Management**: All required libraries (Django, Django REST Framework, PyMongo, Celery, Twilio, LangChain) have been consolidated into a single `requirements.txt` file at the root.

## Platform Workflows & Features

### 1. Digital Health Records & Interoperability (`/api/`)
This feature manages core Electronic Health Record (EHR) operations, authentication, and the historical timeline of patient health. It implements consent-driven access logic, ensuring doctors can only pull historical timelines when patients grant permission. It exposes RESTful API endpoints intended for consumption by the React frontend.

### 2. Smart Donor & NGO Network (`/donor/`)
This serves as the geospatial mobilization tool for emergency blood and organ requirements. It utilizes MongoDB's native Geospatial queries to instantly map emergency requests against registered NGOs and donors, calculating dynamic routing and distances in real-time. It exposes spatial dashboards and triggers notifications.

### 3. Automated Patient Engagement (`/companion/`)
This feature handles prescription adherence and proactive patient communication. Powered by background Celery task queues and Live Scheduler Python threads, it monitors prescription schedules and uses the Twilio API to dispatch real-time SMS notifications to patients when medications are due (or alerts emergency contacts if dosages are missed).

### 4. Agentic AI Assistant (`/ai/`)
An intelligent orchestrator built with LangChain that assists patients via natural language. Exposed at `/ai/chat/`, the AI utilizes specific tools to securely query the MongoDB database for a patient's diagnosis history (to provide wellness tips), search the medical registry for active specialists, and estimate out-of-pocket insurance costs for procedures.

## How to Run the Platform

1. **Activate the Environment**:
   ```bash
   cd caresync_integrated
   .\venv\Scripts\activate
   ```

2. **Ensure MongoDB is Running**:
   The application is configured to default to a local MongoDB instance at `mongodb://127.0.0.1:27017/`. Ensure the MongoDB daemon is active on your machine.
   > [!NOTE]
   > The backend features graceful degradation. If MongoDB is offline, it safely falls back to local JSON data storage for records and uses client-side Haversine mathematical computations for geospatial tracking.

3. **Start the Django Development Server**:
   ```bash
   python manage.py runserver
   ```

4. **Start the Celery Worker (For Patient Engagement/Background Tasks)**:
   In a separate terminal (with the virtual environment activated), run:
   ```bash
   celery -A caresync_core worker -l info --pool=solo
   ```
