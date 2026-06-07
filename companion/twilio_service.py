import os
from datetime import datetime
from dotenv import load_dotenv
from twilio.rest import Client
from caresync_core.mongodb import db

# Load env variables
load_dotenv()

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "whatsapp:+14155238886")

# Flag to verify if Twilio is properly configured
IS_TWILIO_CONFIGURED = bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN)

if IS_TWILIO_CONFIGURED:
    print("Twilio Service is active (Live Mode).")
else:
    print("Twilio credentials not found. Twilio Service is active in Simulation Mode.")

def send_alert(patient_phone: str, patient_name: str, medication_name: str, dosage: str, reminder_time: str, reminder_id=None) -> dict:
    """
    Dispatches a patient engagement alert via WhatsApp or SMS.
    If credentials aren't set, runs in Simulation Mode and logs the event to MongoDB.
    """
    message_body = (
        f"Hello {patient_name}, this is your CareSync Companion! "
        f"It's time to take your medication: *{medication_name}* ({dosage}). "
        f"Scheduled time: {reminder_time}. "
        f"Please click here to confirm: http://127.0.0.1:8000/patient/take/{reminder_id}/"
    )
    
    log_data = {
        "reminder_id": reminder_id,
        "patient_name": patient_name,
        "patient_phone": patient_phone,
        "medication_name": medication_name,
        "dosage": dosage,
        "message": message_body,
        "timestamp": datetime.now(),
        "channel": "WhatsApp" if "whatsapp" in TWILIO_PHONE_NUMBER else "SMS",
    }
    
    # Try sending via live Twilio if configured
    if IS_TWILIO_CONFIGURED:
        try:
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            
            # Format numbers properly for WhatsApp vs SMS
            to_number = patient_phone
            if "whatsapp" in TWILIO_PHONE_NUMBER and not to_number.startswith("whatsapp:"):
                to_number = f"whatsapp:{to_number}"
                
            message = client.messages.create(
                body=message_body,
                from_=TWILIO_PHONE_NUMBER,
                to=to_number
            )
            
            log_data["status"] = "Sent"
            log_data["twilio_sid"] = message.sid
            log_data["mode"] = "Live"
            print(f"Live Twilio WhatsApp Alert sent successfully! SID: {message.sid}")
            
        except Exception as e:
            print(f"Live Twilio dispatch failed: {e}. Falling back to Simulation Mode.")
            log_data["status"] = "Simulated (Failback)"
            log_data["error"] = str(e)
            log_data["mode"] = "Simulation"
    else:
        # Simulation Mode
        log_data["status"] = "Simulated"
        log_data["mode"] = "Simulation"
        print(f"[SIMULATION] WhatsApp Alert to {patient_name} ({patient_phone}): '{message_body}'")
        
    # Write to MongoDB logs collection
    try:
        db.notification_logs.insert_one(log_data)
        
        # Also update the original reminder status in database to 'Sent'
        if reminder_id:
            from bson import ObjectId
            db.reminders.update_one(
                {"_id": ObjectId(reminder_id) if isinstance(reminder_id, str) else reminder_id},
                {"$set": {"status": "Sent", "sent_time": datetime.now(), "twilio_sid": log_data.get("twilio_sid", "SIMULATED_SID")}}
            )
    except Exception as e:
        print(f"Failed to log notification in MongoDB: {e}")
        
    return log_data

def get_recent_notification_logs(limit=15):
    """
    Fetches recent notification logs from MongoDB to display in real-time dashboards.
    """
    try:
        logs = list(db.notification_logs.find().sort("timestamp", -1).limit(limit))
        for log in logs:
            log["_id"] = str(log["_id"])
            if log.get("reminder_id"):
                log["reminder_id"] = str(log["reminder_id"])
            log["timestamp"] = log["timestamp"].strftime("%Y-%m-%d %I:%M:%S %p")
        return logs
    except Exception as e:
        print(f"Failed to fetch notification logs: {e}")
        return []
