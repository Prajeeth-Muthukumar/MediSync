# Amalgamate CareSync Modules into a Single Project

Based on the expanded context, the 4 modules represent the pillars of a complete, industry-grade healthcare platform. While Modules A, B, and C have significant portions recovered, the core python logic for **Module D** appears to be completely lost. We will amalgamate the recovered files and rebuild the missing pieces into a single Django + MongoDB + React application.

## 1. Module A: Digital Health Records & Interoperability
**Goal:** A secure EHR timeline with patient-doctor consent using HL7 FHIR standards.
**Action Plan:**
- Migrate the recovered `Module A/backend/records_api` into a `records_api` Django app.
- Migrate `Module A/frontend` (React + Vite) as the primary user interface.
- Ensure the FHIR JSON schema generator remains intact and validates properly.

## 2. Module B: Smart Donor & NGO Network (Geo-Spatial)
**Goal:** Geo-spatial mapping to find nearest blood banks, donors, and NGOs.
**Action Plan:**
- Migrate `Module B` into a `donor_network` Django app.
- Wire up the PyMongo `$nearSphere` geo-spatial queries to the unified MongoDB connector.
- Connect the frontend to display the Leaflet.js / Google Maps API visualization.

## 3. Module C: Automated Patient Engagement
**Goal:** Automated prescription parsers and scheduled reminders via Twilio + pharmacy affiliates.
**Action Plan:**
- Migrate `Module C` into a `companion` Django app.
- Wire the Celery/Threading background workers (`worker.py`/`tasks.py`) to the central project settings to ensure scheduled push notifications and SMS trigger correctly.

## 4. Module D: Agentic AI Assistant (Reconstruction)
**Goal:** LangChain/LangGraph-based AI Orchestrator that acts as a health companion.
**Action Plan:**
- Since the AI logic files were lost (only localization JS files were recovered), we will **build a new `ai_assistant` Django app** from scratch.
- **Tool 1 (Health Suggestions):** Implement a simple RAG chain querying the unified MongoDB EHR records to answer patient queries.
- **Tool 2 (Doctor Finder):** Implement a tool that queries the MongoDB `medical_registry` for doctors by specialty and triggers a mock appointment booking workflow.
- **Tool 3 (Insurance Estimator):** Implement a document parser tool (simulating an LLM reading policy fine print) to calculate out-of-pocket estimates against a standard cost DB.
- We will expose this Agentic AI via a REST API endpoint so the React frontend can provide a chat interface.

## 5. Unified Database Architecture
- Build `caresync_core/mongodb.py` to provide a single, singleton MongoDB connection client shared by all 4 modules.

## User Review Required

> [!IMPORTANT]
> **LLM Provider for Module D**: To build the Agentic AI, we will need to use an LLM provider (e.g., OpenAI, Google Gemini). For this amalgamation, I plan to use mock responses or open-source LangChain abstractions unless you provide an API key in an `.env` file. Would you like me to build it with a specific provider in mind (e.g., `langchain-google-genai` or `langchain-openai`)?

> [!IMPORTANT]
> **React Frontend vs Django Templates**: Modules B and C currently use server-side rendered Django HTML templates, while Module A uses React. To make it a "single whole project", I can either:
> 1. Serve the React app on the root `/` and keep the Django templates for B and C on their respective `/donor/` and `/companion/` routes.
> 2. Re-write the B and C templates into React components (More time-consuming).
> *Proposed Path:* I will go with Option 1 for rapid amalgamation, converting B and C templates into Django views within the unified project. Let me know if you prefer a full React conversion.

## Verification Plan
1. **Database:** Verify all 4 modules successfully write/read to a single MongoDB database.
2. **Module A & B & C:** Test EHR creation, Geo-spatial query via API, and background worker triggering.
3. **Module D:** Send a test query to the new LangChain agent endpoint to verify tool selection (e.g., "Find me a cardiologist nearby" triggers the Doctor Finder tool).
