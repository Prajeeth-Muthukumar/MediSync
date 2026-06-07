import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from langchain_core.tools import tool
from caresync_core.mongodb import db_client, db

@tool
def get_health_suggestions(patient_id: str) -> str:
    """Provides baseline wellness tips based on the patient's medical history (RAG)."""
    if not db_client.connected:
        return "Database not connected. Cannot fetch history."
    
    # Simple mock RAG
    encounters = list(db["encounters"].find({"patient_id": patient_id}))
    if not encounters:
        return "No medical history found for this patient. Stay hydrated and exercise regularly! (Disclaimer: This is not medical advice)."
    
    diagnoses = [enc.get("diagnosis", "") for enc in encounters]
    return f"Based on your history of {', '.join(diagnoses)}, ensure you maintain a low-sodium diet and monitor your blood pressure. (Disclaimer: Not medical advice)."

@tool
def find_doctor(specialty: str) -> str:
    """Queries the internal database of doctors based on specialization."""
    if not db_client.connected:
        return "Database not connected."
    
    doctors = list(db["medical_registry"].find({"specialty": {"$regex": specialty, "$options": "i"}, "status": "Active"}))
    if not doctors:
        return f"No active doctors found for specialty: {specialty}."
    
    names = [doc.get("doctor_name", "Unknown") for doc in doctors]
    return f"Found the following doctors: {', '.join(names)}. Would you like me to book an appointment?"

@tool
def estimate_insurance(procedure_name: str) -> str:
    """Parses a user's uploaded insurance policy and estimates out-of-pocket costs."""
    costs = {
        "appendectomy": 5000,
        "mri": 1500,
        "blood test": 200
    }
    base_cost = costs.get(procedure_name.lower(), 1000)
    covered = base_cost * 0.8
    out_of_pocket = base_cost - covered
    return f"Based on standard policy parsing, {procedure_name} costs ${base_cost}. Your estimated out-of-pocket cost is ${out_of_pocket}."


@csrf_exempt
def ai_chat(request):
    """
    Mock agent endpoint that routes user input to the correct tool.
    In a production setup, this would use an LLM (e.g. ChatOpenAI) to bind tools and execute.
    """
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            user_message = data.get("message", "").lower()
            patient_id = data.get("patient_id", "P-1001")
            
            # Simple intent routing instead of full LLM for demo purposes
            if "health" in user_message or "suggest" in user_message or "history" in user_message:
                response = get_health_suggestions.invoke({"patient_id": patient_id})
            elif "doctor" in user_message or "find" in user_message or "cardiologist" in user_message:
                spec = "Cardiology" if "cardio" in user_message else "General"
                response = find_doctor.invoke({"specialty": spec})
            elif "insurance" in user_message or "cost" in user_message or "estimate" in user_message:
                proc = "mri" if "mri" in user_message else "appendectomy"
                response = estimate_insurance.invoke({"procedure_name": proc})
            else:
                response = "I am your CareSync AI Orchestrator. I can suggest health tips based on your history, find doctors, and estimate insurance costs. How can I help you?"
                
            return JsonResponse({"response": response, "status": "success"})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)
    return JsonResponse({"status": "error", "message": "POST required"})
