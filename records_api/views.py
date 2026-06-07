import datetime
import uuid
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .db_connection import users_collection, encounters_collection, consents_collection, appointments_collection
from .verification_service import verify_doctor_license
from .fhir_helper import generate_fhir_bundle

@api_view(['POST'])
def register_doctor(request):
    """
    Registers a new doctor after verifying their license against the medical registry.
    """
    data = request.data
    username = data.get('username')
    password = data.get('password')
    name = data.get('name')
    license_number = data.get('license_number')
    specializations = data.get('specializations', '')

    if not all([username, password, name, license_number]):
        return Response({"error": "Missing required fields."}, status=status.HTTP_400_BAD_REQUEST)

    # Check if username already exists
    if users_collection.find_one({"username": username}):
        return Response({"error": "Username already exists."}, status=status.HTTP_400_BAD_REQUEST)

    # Verify doctor license number
    verification = verify_doctor_license(license_number)
    if not verification["is_valid"]:
        return Response({
            "error": "Medical license verification failed.",
            "details": verification["error_message"]
        }, status=status.HTTP_400_BAD_REQUEST)

    registry_details = verification["doctor_details"]

    # Save doctor profile
    doctor_user = {
        "username": username,
        "password": password, # Plain text for prototype simplicity
        "role": "doctor",
        "name": registry_details["doctor_name"],
        "license_number": license_number,
        "specialty": specializations if specializations.strip() else registry_details["specialty"],
        "is_verified": True,
        "verified_at": datetime.datetime.utcnow().isoformat() + "Z"
    }
    
    users_collection.insert_one(doctor_user)
    return Response({
        "message": "Doctor registered and verified successfully!",
        "user": {
            "username": username,
            "role": "doctor",
            "name": registry_details["doctor_name"],
            "license_number": license_number,
            "specialty": specializations if specializations.strip() else registry_details["specialty"],
            "is_verified": True
        }
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def register_patient(request):
    """
    Registers a new patient and generates a unique Patient ID.
    """
    data = request.data
    username = data.get('username')
    password = data.get('password')
    name = data.get('name')
    gender = data.get('gender', 'unknown')
    birth_date = data.get('birth_date')
    telecom = data.get('telecom', '')
    address = data.get('address', '')

    if not all([username, password, name, birth_date]):
        return Response({"error": "Missing required fields."}, status=status.HTTP_400_BAD_REQUEST)

    # Check if username already exists
    if users_collection.find_one({"username": username}):
        return Response({"error": "Username already exists."}, status=status.HTTP_400_BAD_REQUEST)

    # Generate Unique Patient ID (P-XXXX)
    patient_id = f"P-{uuid.uuid4().hex[:6].upper()}"

    patient_user = {
        "username": username,
        "password": password,
        "role": "patient",
        "patient_id": patient_id,
        "name": name,
        "gender": gender,
        "birth_date": birth_date,
        "telecom": telecom,
        "address": address
    }

    users_collection.insert_one(patient_user)
    return Response({
        "message": "Patient registered successfully!",
        "user": {
            "username": username,
            "role": "patient",
            "patient_id": patient_id,
            "name": name
        }
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def login_user(request):
    """
    Logs in a user (Doctor or Patient) and returns their profile.
    """
    data = request.data
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return Response({"error": "Username and password are required."}, status=status.HTTP_400_BAD_REQUEST)

    user = users_collection.find_one({"username": username, "password": password})
    if not user:
        return Response({"error": "Invalid username or password."}, status=status.HTTP_401_UNAUTHORIZED)

    # Build response payload
    user_data = {
        "username": user["username"],
        "role": user["role"],
        "name": user["name"]
    }

    if user["role"] == "doctor":
        user_data["license_number"] = user["license_number"]
        user_data["specialty"] = user["specialty"]
        user_data["is_verified"] = user.get("is_verified", False)
    elif user["role"] == "patient":
        user_data["patient_id"] = user["patient_id"]
        user_data["gender"] = user.get("gender")
        user_data["birth_date"] = user.get("birth_date")

    return Response({
        "message": "Login successful",
        "user": user_data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
def search_patient(request):
    """
    Searches for a patient by ID or username and checks if the calling doctor has consent.
    """
    query = request.GET.get('query')
    doctor_username = request.GET.get('doctor_username')

    if not query:
        return Response({"error": "Search query is required."}, status=status.HTTP_400_BAD_REQUEST)

    # Find patient
    patient = users_collection.find_one({
        "role": "patient",
        "$or": [
            {"patient_id": query.strip().upper()},
            {"username": query.strip().lower()}
        ]
    })

    if not patient:
        return Response({"error": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)

    # Check consent if doctor_username is provided
    has_consent = False
    consent_status = "none"
    if doctor_username:
        # Check if doctor is verified
        doctor = users_collection.find_one({"username": doctor_username, "role": "doctor"})
        if doctor and doctor.get("is_verified", False):
            consent_record = consents_collection.find_one({
                "patient_id": patient["patient_id"],
                "doctor_username": doctor_username
            })
            if consent_record:
                consent_status = consent_record.get("status", "none")
                if consent_status == "granted":
                    has_consent = True
                    
            # Implicit consent via an active/past appointment
            if not has_consent:
                active_appt = appointments_collection.find_one({
                    "patient_id": patient["patient_id"],
                    "doctor_username": doctor_username,
                    "status": {"$in": ["approved", "in_progress"]}
                })
                if active_appt:
                    has_consent = True
                    consent_status = "granted"

    return Response({
        "patient": {
            "patient_id": patient["patient_id"],
            "name": patient["name"],
            "gender": patient.get("gender"),
            "birth_date": patient.get("birth_date"),
            "blood_group": patient.get("blood_group"),
            "weight": patient.get("weight"),
            "height": patient.get("height"),
            "telecom": patient.get("telecom"),
            "address": patient.get("address")
        },
        "has_consent": has_consent,
        "consent_status": consent_status
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
def create_record(request):
    """
    Creates a new clinical record, formats it into a FHIR Bundle, and saves it.
    Requires doctor_username to correspond to a verified doctor.
    """
    data = request.data
    patient_id = data.get('patient_id')
    doctor_username = data.get('doctor_username')
    icd_code = data.get('icd_code')
    icd_display = data.get('icd_display')
    medications = data.get('medications', []) # Expect [{name, dosage, frequency}]
    clinical_notes = data.get('clinical_notes', '')

    if not all([patient_id, doctor_username, icd_code, icd_display]):
        return Response({"error": "Missing required fields."}, status=status.HTTP_400_BAD_REQUEST)

    # Verify doctor exists and is verified
    doctor = users_collection.find_one({"username": doctor_username, "role": "doctor"})
    if not doctor or not doctor.get("is_verified", False):
        return Response({"error": "Only verified doctors can create health records."}, status=status.HTTP_403_FORBIDDEN)

    # Fetch patient details
    patient = users_collection.find_one({"patient_id": patient_id, "role": "patient"})
    if not patient:
        return Response({"error": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)

    # Format clinical record to FHIR Bundle
    fhir_bundle = generate_fhir_bundle(
        patient_id=patient_id,
        patient_name=patient["name"],
        doctor_license=doctor["license_number"],
        doctor_name=doctor["name"],
        icd_code=icd_code,
        icd_display=icd_display,
        medications=medications,
        clinical_notes=clinical_notes
    )

    # Insert into encounters collection
    record = {
        "patient_id": patient_id,
        "doctor_username": doctor_username,
        "doctor_name": doctor["name"],
        "doctor_specialty": doctor["specialty"],
        "created_at": datetime.datetime.utcnow().isoformat() + "Z",
        "fhir_bundle": fhir_bundle
    }

    encounters_collection.insert_one(record)

    return Response({
        "message": "Health Record created successfully!",
        "record_id": str(record["_id"]),
        "fhir_bundle": fhir_bundle
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def get_consent_status(request):
    """
    Returns consent status for a patient-doctor pair.
    """
    patient_id = request.GET.get('patient_id')
    doctor_username = request.GET.get('doctor_username')

    if not patient_id or not doctor_username:
        return Response({"error": "patient_id and doctor_username are required."}, status=status.HTTP_400_BAD_REQUEST)

    consent = consents_collection.find_one({
        "patient_id": patient_id,
        "doctor_username": doctor_username
    })

    status_val = consent.get("status", "none") if consent else "none"

    return Response({"status": status_val}, status=status.HTTP_200_OK)


@api_view(['POST'])
def toggle_consent(request):
    """
    Grants, Revokes, or Requests consent for a doctor to view a patient's historical records.
    """
    data = request.data
    patient_id = data.get('patient_id')
    doctor_username = data.get('doctor_username')
    action = data.get('action') # 'grant', 'revoke', or 'request'

    if not all([patient_id, doctor_username, action]):
        return Response({"error": "Missing required fields."}, status=status.HTTP_400_BAD_REQUEST)

    if action not in ['grant', 'revoke', 'request']:
        return Response({"error": "Invalid action. Use 'grant', 'revoke', or 'request'."}, status=status.HTTP_400_BAD_REQUEST)

    status_val = "granted" if action == "grant" else ("requested" if action == "request" else "revoked")

    consents_collection.update_one(
        {"patient_id": patient_id, "doctor_username": doctor_username},
        {
            "$set": {
                "status": status_val,
                "updated_at": datetime.datetime.utcnow().isoformat() + "Z"
            }
        },
        upsert=True
    )

    return Response({
        "message": f"Consent successfully {status_val} for doctor {doctor_username}.",
        "status": status_val
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
def get_timeline(request):
    """
    Retrieves the clinical timeline of a patient.
    Checks consent if requested by a doctor. Allows if requested by the patient themselves.
    """
    patient_id = request.GET.get('patient_id')
    doctor_username = request.GET.get('doctor_username')
    requester_role = request.GET.get('requester_role') # 'doctor' or 'patient'

    if not patient_id:
        return Response({"error": "patient_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    # Access control check
    if requester_role == 'doctor':
        if not doctor_username:
            return Response({"error": "doctor_username is required for doctor role."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify doctor is verified
        doctor = users_collection.find_one({"username": doctor_username, "role": "doctor"})
        if not doctor or not doctor.get("is_verified", False):
            return Response({"error": "Unverified doctor account."}, status=status.HTTP_403_FORBIDDEN)

        # Check consent (either explicit, or implicitly granted by an active/past appointment)
        consent = consents_collection.find_one({
            "patient_id": patient_id,
            "doctor_username": doctor_username,
            "status": "granted"
        })
        
        has_access = bool(consent)
        
        if not has_access:
            # Check for an active or completed appointment
            active_appt = appointments_collection.find_one({
                "patient_id": patient_id,
                "doctor_username": doctor_username,
                "status": {"$in": ["approved", "in_progress"]}
            })
            if active_appt:
                has_access = True
                
        if not has_access:
            return Response({
                "error": "Access Denied. Consent or an active appointment is required from the patient to view this timeline."
            }, status=status.HTTP_403_FORBIDDEN)

    # If everything is valid or patient themselves, fetch timeline
    records = list(encounters_collection.find({"patient_id": patient_id}).sort("created_at", pymongo.DESCENDING))

    # Convert MongoDB _id ObjectIds to strings
    for r in records:
        r["_id"] = str(r["_id"])

    return Response({
        "patient_id": patient_id,
        "timeline": records
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
def list_doctors(request):
    """
    Lists all verified doctors in the system and attaches their consent status for the requesting patient.
    """
    patient_id = request.GET.get('patient_id')
    doctors = list(users_collection.find({"role": "doctor", "is_verified": True}, {
        "password": 0, "verified_at": 0, "_id": 0
    }))
    
    # Attach consent status to each doctor profile
    for dr in doctors:
        dr["consent_status"] = "none"
        
        # Calculate total successful appointments
        appt_count = appointments_collection.count_documents({
            "doctor_username": dr["username"],
            "status": {"$in": ["approved", "completed"]}
        })
        dr["total_appointments"] = appt_count + dr.get("base_appointments", 85) # Base 85 for realism
        
        if patient_id:
            # We deprecated explicit consents, but leaving this for backward compatibility
            # In the new flow, we check if they have an active appointment
            active_appt = appointments_collection.find_one({
                "patient_id": patient_id,
                "doctor_username": dr["username"],
                "status": {"$in": ["approved", "in_progress"]}
            })
            if active_appt:
                dr["consent_status"] = "granted"

    return Response({"doctors": doctors}, status=status.HTTP_200_OK)

@api_view(['PUT'])
def update_doctor_schedule(request):
    data = request.data
    username = data.get('username')
    max_patients_per_hour = data.get('max_patients_per_hour')
    clinic_location = data.get('clinic_location')
    years_of_experience = data.get('years_of_experience')
    schedule_blocks = data.get('schedule_blocks') # List of dicts

    if not username:
        return Response({"error": "Doctor username is required."}, status=status.HTTP_400_BAD_REQUEST)

    update_fields = {}
    if max_patients_per_hour is not None: update_fields["max_patients_per_hour"] = int(max_patients_per_hour)
    if clinic_location is not None: update_fields["clinic_location"] = clinic_location
    if years_of_experience is not None: update_fields["years_of_experience"] = int(years_of_experience) if str(years_of_experience).isdigit() else 0
    if schedule_blocks is not None: update_fields["schedule_blocks"] = schedule_blocks

    # Remove deprecated fields if they exist
    unset_fields = {"domains": "", "expertise": "", "working_time_start": "", "working_time_end": ""}

    users_collection.update_one(
        {"username": username, "role": "doctor"},
        {"$set": update_fields, "$unset": unset_fields}
    )

    return Response({"message": "Schedule updated successfully."}, status=status.HTTP_200_OK)

@api_view(['POST'])
def book_appointment(request):
    data = request.data
    patient_id = data.get('patient_id')
    doctor_username = data.get('doctor_username')
    time_slot = data.get('time_slot') # ISO format string like "2026-06-05T10:00:00Z"

    if not all([patient_id, doctor_username, time_slot]):
        return Response({"error": "Missing required fields."}, status=status.HTTP_400_BAD_REQUEST)

    # Prevent patient double-booking for the SAME time slot
    slot_prefix = time_slot[:13] # YYYY-MM-DDTHH
    patient_existing = appointments_collection.count_documents({
        "patient_id": patient_id,
        "time_slot": {"$regex": f"^{slot_prefix}"},
        "status": {"$in": ["pending", "approved"]}
    })
    
    if patient_existing > 0:
        return Response({"error": "You already have an appointment scheduled for this time slot."}, status=status.HTTP_400_BAD_REQUEST)

    # Check capacity
    doctor = users_collection.find_one({"username": doctor_username, "role": "doctor"})
    if not doctor:
        return Response({"error": "Doctor not found."}, status=status.HTTP_404_NOT_FOUND)
        
    max_patients = int(doctor.get("max_patients_per_hour", 1))
    
    # Simple capacity check for the same hour slot
    # In a real app we'd parse the datetime properly
    slot_prefix = time_slot[:13] # YYYY-MM-DDTHH
    existing_count = appointments_collection.count_documents({
        "doctor_username": doctor_username,
        "time_slot": {"$regex": f"^{slot_prefix}"},
        "status": {"$in": ["pending", "approved"]}
    })
    
    if existing_count >= max_patients:
        return Response({"error": f"Doctor is fully booked for this hour (Max: {max_patients})."}, status=status.HTTP_400_BAD_REQUEST)

    appointment = {
        "patient_id": patient_id,
        "doctor_username": doctor_username,
        "time_slot": time_slot,
        "status": "pending",
        "created_at": datetime.datetime.utcnow().isoformat() + "Z"
    }

    appointments_collection.insert_one(appointment)
    return Response({"message": "Appointment requested.", "appointment": appointment}, status=status.HTTP_201_CREATED)

@api_view(['GET'])
def list_appointments(request):
    username = request.GET.get('username')
    role = request.GET.get('role')

    if not username or not role:
        return Response({"error": "Username and role required."}, status=status.HTTP_400_BAD_REQUEST)

    if role == 'doctor':
        appointments = list(appointments_collection.find({"doctor_username": username}).sort("time_slot", -1))
        # Attach patient names
        for appt in appointments:
            pat = users_collection.find_one({"patient_id": appt["patient_id"]})
            appt["patient_name"] = pat["name"] if pat else "Unknown"
    elif role == 'patient':
        user = users_collection.find_one({"username": username})
        appointments = list(appointments_collection.find({"patient_id": user["patient_id"]}).sort("time_slot", -1))
        # Attach doctor details
        for appt in appointments:
            doc = users_collection.find_one({"username": appt["doctor_username"]})
            appt["doctor_name"] = doc["name"] if doc else "Unknown"
            appt["clinic_location"] = doc.get("clinic_location", "Unknown")
            appt["expertise"] = doc.get("expertise", doc.get("specialty", ""))

    for appt in appointments:
        appt["_id"] = str(appt["_id"])

    return Response({"appointments": appointments}, status=status.HTTP_200_OK)

@api_view(['POST'])
def update_appointment_status(request):
    data = request.data
    appointment_id = data.get('appointment_id')
    status_val = data.get('status')
    schedule_follow_up = data.get('schedule_follow_up') # 'yes' or 'no'
    follow_up_date = data.get('follow_up_date') # e.g. "2026-06-15T10:00:00Z"

    if not appointment_id or not status_val:
        return Response({"error": "Missing appointment_id or status."}, status=status.HTTP_400_BAD_REQUEST)

    import bson
    try:
        obj_id = bson.ObjectId(appointment_id)
        query = {"$or": [{"_id": obj_id}, {"_id": appointment_id}]}
    except:
        query = {"_id": appointment_id}

    appointment = appointments_collection.find_one(query)
    
    if not appointment:
        return Response({"error": "Appointment not found."}, status=status.HTTP_404_NOT_FOUND)

    appointments_collection.update_one(query, {"$set": {"status": status_val, "updated_at": datetime.datetime.utcnow().isoformat() + "Z"}})

    # Auto-Consent Logic
    if status_val == "approved":
        consents_collection.update_one(
            {"patient_id": appointment["patient_id"], "doctor_username": appointment["doctor_username"]},
            {"$set": {"status": "granted", "updated_at": datetime.datetime.utcnow().isoformat() + "Z"}},
            upsert=True
        )
    elif status_val == "completed":
        if schedule_follow_up == 'yes' and follow_up_date:
            # Create a new approved appointment for the follow-up
            new_appt = {
                "patient_id": appointment["patient_id"],
                "doctor_username": appointment["doctor_username"],
                "time_slot": follow_up_date,
                "status": "approved", # Pre-approved by doctor
                "created_at": datetime.datetime.utcnow().isoformat() + "Z"
            }
            appointments_collection.insert_one(new_appt)
            # Do NOT revoke consent, keep it granted so doctor can prepare for follow up
        else:
            # Revoke consent
            consents_collection.update_one(
                {"patient_id": appointment["patient_id"], "doctor_username": appointment["doctor_username"]},
                {"$set": {"status": "revoked", "updated_at": datetime.datetime.utcnow().isoformat() + "Z"}},
                upsert=True
            )

    return Response({"message": f"Appointment marked as {status_val}."}, status=status.HTTP_200_OK)

@api_view(['GET'])
def get_permitted_patients(request):
    """
    Returns a list of patients who have granted consent to the requesting doctor.
    """
    doctor_username = request.GET.get('doctor_username')
    
    if not doctor_username:
        return Response({"error": "doctor_username is required."}, status=status.HTTP_400_BAD_REQUEST)
        
    permitted_consents = list(consents_collection.find({
        "doctor_username": doctor_username,
        "status": "granted"
    }))
    
    patients = []
    for consent in permitted_consents:
        patient = users_collection.find_one({"patient_id": consent["patient_id"], "role": "patient"})
        if patient:
            patients.append({
                "patient_id": patient["patient_id"],
                "name": patient["name"],
                "gender": patient.get("gender"),
                "birth_date": patient.get("birth_date"),
                "telecom": patient.get("telecom"),
                "address": patient.get("address")
            })
            
    return Response({"patients": patients}, status=status.HTTP_200_OK)


@api_view(['GET'])
def get_doctor_logs(request):
    doctor_username = request.GET.get('doctor_username')
    if not doctor_username:
        return Response({"error": "Missing doctor_username"}, status=status.HTTP_400_BAD_REQUEST)
    records = list(records_collection.find({"doctor_username": doctor_username}).sort("created_at", -1))
    for r in records:
        r["_id"] = str(r["_id"])
    return Response({"logs": records}, status=status.HTTP_200_OK)

@api_view(['GET'])
def get_appointment_slots(request):
    doctor_username = request.GET.get('doctor_username')
    date_str = request.GET.get('date') # YYYY-MM-DD
    patient_id = request.GET.get('patient_id') # Optional, to check user's own status
    if not doctor_username or not date_str:
        return Response({"error": "Missing parameters"}, status=status.HTTP_400_BAD_REQUEST)
        
    doctor = users_collection.find_one({"username": doctor_username, "role": "doctor"})
    if not doctor:
        return Response({"error": "Doctor not found"}, status=status.HTTP_404_NOT_FOUND)
        
    import datetime
    today_date = datetime.datetime.now().strftime('%Y-%m-%d')
    
    # Decide which schedule to use
    if date_str == today_date:
        schedule_blocks = doctor.get("schedule_today")
    else:
        schedule_blocks = doctor.get("schedule_tomorrow")
        
    if schedule_blocks is None:
        usual_start = doctor.get("usual_start", "09:00")
        usual_end = doctor.get("usual_end", "17:00")
        schedule_blocks = [{"start_time": usual_start, "end_time": usual_end, "specialization": doctor.get("specialty", "General")}]
        
    max_patients = int(doctor.get("max_patients_per_hour", 1))
    
    slots_info = []
    for blk in schedule_blocks:
        start = blk.get("start_time")
        end = blk.get("end_time")
        if not start or not end: continue
        
        try:
            start_hour = int(start.split(":")[0])
            end_hour = int(end.split(":")[0])
        except ValueError:
            continue
            
        # Iterate over each hour in the block
        for hour in range(start_hour, end_hour):
            hour_prefix = f"{hour:02d}"
            slot_prefix = f"{date_str}T{hour_prefix}"
            
            existing_count = appointments_collection.count_documents({
                "doctor_username": doctor_username,
                "time_slot": {"$regex": f"^{slot_prefix}"},
                "status": {"$in": ["pending", "approved"]}
            })
            
            user_status = None
            if patient_id:
                user_appt = appointments_collection.find_one({
                    "doctor_username": doctor_username,
                    "patient_id": patient_id,
                    "time_slot": {"$regex": f"^{slot_prefix}"},
                    "status": {"$in": ["pending", "approved"]}
                })
                if user_appt:
                    user_status = user_appt.get("status")
            
            slots_info.append({
                "start_time": f"{hour:02d}:00",
                "end_time": f"{(hour+1):02d}:00",
                "specialization": blk.get("specialization", ""),
                "total_capacity": max_patients,
                "booked": existing_count,
                "remaining": max(0, max_patients - existing_count),
                "slot_prefix": slot_prefix,
                "user_status": user_status
            })
        
    return Response({"slots": slots_info, "max_capacity": max_patients}, status=status.HTTP_200_OK)

@api_view(['GET'])
def get_notifications(request):
    patient_id = request.GET.get('patient_id')
    if not patient_id:
        return Response({"error": "patient_id required"}, status=400)
    notifs = list(notifications_collection.find({"patient_id": patient_id, "read": False}).sort("created_at", -1))
    return Response({"notifications": notifs}, status=200)

@api_view(['POST'])
def mark_notification_read(request):
    notif_id = request.data.get('notification_id')
    import bson
    try:
        obj_id = bson.ObjectId(notif_id)
        q = {"$or": [{"_id": obj_id}, {"_id": notif_id}]}
    except:
        q = {"_id": notif_id}
    notifications_collection.update_one(q, {"$set": {"read": True}})
    return Response({"message": "Marked read"}, status=200)


@api_view(['POST'])
def update_doctor_profile(request):
    doctor_username = request.data.get('username')
    bio = request.data.get('bio', '')
    credentials = request.data.get('credentials', '')
    
    if not doctor_username:
        return Response({"error": "doctor_username is required."}, status=status.HTTP_400_BAD_REQUEST)
        
    doctor = users_collection.find_one({"username": doctor_username, "role": "doctor"})
    if not doctor:
        return Response({"error": "Doctor not found."}, status=status.HTTP_404_NOT_FOUND)
        
    users_collection.update_one(
        {"username": doctor_username, "role": "doctor"},
        {"$set": {
            "bio": bio,
            "credentials": credentials
        }}
    )
    
    return Response({"message": "Profile updated successfully.", "bio": bio, "credentials": credentials}, status=status.HTTP_200_OK)
