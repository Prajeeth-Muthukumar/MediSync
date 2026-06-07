import os
from datetime import datetime, timedelta
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from bson import ObjectId
from caresync_core.mongodb import db
from companion.parser import parse_dosage_frequency
from companion.twilio_service import send_alert, get_recent_notification_logs
from companion.affiliate_service import get_pharmacy_comparisons

# Helper to serialize MongoDB documents to JSON
def clean_doc(doc):
    if not doc:
        return None
    doc["id"] = str(doc.get("_id"))
    doc.pop("_id", None)
    for key, val in doc.items():
        if isinstance(val, ObjectId):
            doc[key] = str(val)
        elif isinstance(val, datetime):
            doc[key] = val.strftime("%Y-%m-%d %I:%M %p")
    return doc

def seed_patients_if_empty():
    """
    Seeds a few mock patients if patients collection is empty.
    """
    try:
        if db.patients.count_documents({}) == 0:
            mock_patients = [
                {
                    "name": "Jeevan",
                    "phone": "+917599406301",
                    "email": "jeevan@care.sync",
                    "age": 22,
                    "gender": "Male",
                    "address": "Grove Apt, Chennai",
                    "created_at": datetime.now()
                },
                {
                    "name": "Aarav Sharma",
                    "phone": "+919876543210",
                    "email": "aarav.sharma@caresync.com",
                    "age": 45,
                    "gender": "Male",
                    "address": "12 Ridge Road, Mumbai",
                    "created_at": datetime.now()
                },
                {
                    "name": "Diya Nair",
                    "phone": "+918887776665",
                    "email": "diya.nair@caresync.com",
                    "age": 30,
                    "gender": "Female",
                    "address": "45 Lakeview, Kochi",
                    "created_at": datetime.now()
                }
            ]
            db.patients.insert_many(mock_patients)
            print("[Database Seed] Seeded mock patients successfully.")
    except Exception as e:
        print(f"[Database Seed] Error seeding patients: {e}")

# Doctor Workspace Dashboard
def doctor_dashboard(request):
    seed_patients_if_empty()
    
    selected_patient = None
    prescriptions = []
    
    # 1. Handle Patient Selection
    patient_id_str = request.GET.get("patient_id")
    if patient_id_str:
        try:
            selected_patient = db.patients.find_one({"_id": ObjectId(patient_id_str)})
            if selected_patient:
                selected_patient = clean_doc(selected_patient)
                # Fetch prescriptions for this patient
                prescriptions = list(db.prescriptions.find({"patient_id": ObjectId(patient_id_str)}).sort("created_at", -1))
                for rx in prescriptions:
                    clean_doc(rx)
        except Exception as e:
            print(f"Error fetching patient: {e}")
            
    # 2. Fetch all patients for search/select registry
    patients_cursor = db.patients.find().sort("name", 1)
    patients = [clean_doc(p) for p in patients_cursor]
    
    # 3. Fetch recent alert notification logs
    notification_logs = get_recent_notification_logs()
    
    context = {
        "patients": patients,
        "selected_patient": selected_patient,
        "prescriptions": prescriptions,
        "notification_logs": notification_logs,
        "current_page": "doctor"
    }
    return render(request, "companion/doctor.html", context)

# API: On-the-fly dosage frequency parser
def api_parse_frequency(request):
    freq_text = request.GET.get("freq", "")
    parsed_info = parse_dosage_frequency(freq_text)
    return JsonResponse(parsed_info)

# Action: Save prescription and generate notifications
@csrf_exempt
def save_prescription(request):
    if request.method == "POST":
        patient_id_str = request.POST.get("patient_id")
        doctor_name = request.POST.get("doctor_name", "Dr. Sarah Jenkins")
        diagnosis = request.POST.get("diagnosis", "Essential Hypertension")
        
        med_names = request.POST.getlist("med_name[]")
        dosages = request.POST.getlist("dosage[]")
        frequencies = request.POST.getlist("frequency[]")
        durations = request.POST.getlist("duration[]")
        
        if not patient_id_str or not med_names:
            return redirect("/doctor/")
            
        try:
            patient_id = ObjectId(patient_id_str)
            patient = db.patients.find_one({"_id": patient_id})
            
            medications = []
            reminder_docs = []
            
            # Save the prescription details and create reminder timelines
            rx_id = ObjectId()
            
            for i in range(len(med_names)):
                name = med_names[i].strip()
                dosage = dosages[i].strip()
                freq = frequencies[i].strip()
                dur_days = int(durations[i].strip() or 5)
                
                if not name:
                    continue
                    
                parsed_schedule = parse_dosage_frequency(freq)
                medications.append({
                    "name": name,
                    "dosage": dosage,
                    "frequency": freq,
                    "parsed_times": parsed_schedule["times"],
                    "duration_days": dur_days
                })
                
                # Generate scheduled reminders in the future
                start_date = datetime.now()
                for day in range(dur_days):
                    current_day = start_date + timedelta(days=day)
                    for time_str in parsed_schedule["times"]:
                        hr, minute = map(int, time_str.split(":"))
                        scheduled_time = datetime(
                            year=current_day.year,
                            month=current_day.month,
                            day=current_day.day,
                            hour=hr,
                            minute=minute
                        )
                        
                        # Only schedule if in the future (plus a tiny buffer or let past trigger now for demo!)
                        # For demo, if scheduled time is slightly in the past (today), we can still queue it so it fires instantly!
                        reminder_docs.append({
                            "prescription_id": rx_id,
                            "patient_id": patient_id,
                            "medication_name": name,
                            "dosage": dosage,
                            "scheduled_time": scheduled_time,
                            "status": "Pending", # Pending, Sent, Failed, Taken, Missed
                            "parsed_frequency": freq,
                            "notification_channel": "WhatsApp"
                        })
                        
            # Insert prescription
            db.prescriptions.insert_one({
                "_id": rx_id,
                "patient_id": patient_id,
                "doctor_name": doctor_name,
                "diagnosis": diagnosis,
                "medications": medications,
                "created_at": datetime.now()
            })
            
            # Insert reminders
            if reminder_docs:
                db.reminders.insert_many(reminder_docs)
                
            print(f"[Prescription Saved] Successfully queued {len(reminder_docs)} reminders.")
            
        except Exception as e:
            print(f"Error saving prescription: {e}")
            
        return redirect(f"/doctor/?patient_id={patient_id_str}")
        
    return redirect("/doctor/")

# Patient Companion Portal
def patient_dashboard(request):
    seed_patients_if_empty()
    
    # Fallback default: select the first patient (e.g., Jeevan) if none selected
    patient_id_str = request.GET.get("patient_id")
    if not patient_id_str:
        first_patient = db.patients.find_one()
        if first_patient:
            patient_id_str = str(first_patient["_id"])
            
    selected_patient = None
    reminders = []
    prescriptions = []
    
    if patient_id_str:
        try:
            pid = ObjectId(patient_id_str)
            selected_patient = clean_doc(db.patients.find_one({"_id": pid}))
            
            # Fetch patient reminders for today and future
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timedelta(days=2) # Fetch today + tomorrow's schedule
            
            reminders_cursor = db.reminders.find({
                "patient_id": pid,
                "scheduled_time": {"$gte": today_start, "$lt": today_end}
            }).sort("scheduled_time", 1)
            
            reminders = [clean_doc(r) for r in reminders_cursor]
            
            # Retrieve prescriptions to load pricing comparisons
            prescriptions_cursor = db.prescriptions.find({"patient_id": pid}).sort("created_at", -1)
            prescriptions = []
            for rx in prescriptions_cursor:
                rx_cleaned = clean_doc(rx)
                # Attach pharmacy price comparison details to each medication!
                for med in rx_cleaned.get("medications", []):
                    med["comparisons"] = get_pharmacy_comparisons(med["name"])
                prescriptions.append(rx_cleaned)
                
        except Exception as e:
            print(f"Error loading patient dashboard: {e}")
            
    # Fetch all patients for switcher dropdown
    patients = [clean_doc(p) for p in db.patients.find().sort("name", 1)]
    
    context = {
        "patients": patients,
        "selected_patient": selected_patient,
        "reminders": reminders,
        "prescriptions": prescriptions,
        "current_page": "patient"
    }
    return render(request, "companion/patient.html", context)

# Action: Confirm medication taken
def confirm_medication_taken(request, reminder_id):
    try:
        rid = ObjectId(reminder_id)
        reminder = db.reminders.find_one({"_id": rid})
        if reminder:
            db.reminders.update_one(
                {"_id": rid},
                {"$set": {"status": "Taken", "taken_time": datetime.now()}}
            )
            patient_id = str(reminder["patient_id"])
            return redirect(f"/patient/?patient_id={patient_id}")
    except Exception as e:
        print(f"Error marking reminder as taken: {e}")
        
    return redirect("/patient/")

# Action: Confirm medication missed
def confirm_medication_missed(request, reminder_id):
    try:
        rid = ObjectId(reminder_id)
        reminder = db.reminders.find_one({"_id": rid})
        if reminder:
            db.reminders.update_one(
                {"_id": rid},
                {"$set": {"status": "Missed"}}
            )
            patient_id = str(reminder["patient_id"])
            return redirect(f"/patient/?patient_id={patient_id}")
    except Exception as e:
        print(f"Error marking reminder as missed: {e}")
        
    return redirect("/patient/")

# API: Fetch recent notification logs for real-time dashboard updates
def api_notification_logs(request):
    logs = get_recent_notification_logs(limit=10)
    return JsonResponse({"logs": logs})

# Pharmacy Shopping comparison view
def pharmacy_affiliates(request):
    medication_name = request.GET.get("medication", "Metformin 500mg")
    comparisons = get_pharmacy_comparisons(medication_name)
    
    context = {
        "medication_name": medication_name,
        "comparisons": comparisons,
        "current_page": "pharmacy"
    }
    return render(request, "companion/pharmacy.html", context)
