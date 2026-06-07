from celery import shared_task
from datetime import datetime
from bson import ObjectId
from caresync_core.mongodb import db
from companion.twilio_service import send_alert

@shared_task
def send_medication_reminder_task(reminder_id_str: str):
    """
    Celery task to dispatch a single medication reminder by ID.
    """
    try:
        reminder = db.reminders.find_one({"_id": ObjectId(reminder_id_str)})
        if not reminder or reminder.get("status") != "Pending":
            return f"Reminder {reminder_id_str} not found or already sent."
            
        patient = db.patients.find_one({"_id": reminder["patient_id"]})
        if not patient:
            return f"Patient not found for reminder {reminder_id_str}."
            
        # Dispatch alert using Twilio service
        log_res = send_alert(
            patient_phone=patient.get("phone", ""),
            patient_name=patient.get("name", "Patient"),
            medication_name=reminder.get("medication_name", "Medication"),
            dosage=reminder.get("dosage", "1 tablet"),
            reminder_time=reminder["scheduled_time"].strftime("%I:%M %p"),
            reminder_id=str(reminder["_id"])
        )
        
        return f"Dispatched reminder: {log_res['status']}"
        
    except Exception as e:
        return f"Failed to send reminder {reminder_id_str}: {e}"

@shared_task
def poll_and_send_due_reminders_task():
    """
    Periodic Celery task (cron equivalent) to sweep MongoDB and send any due reminders.
    """
    now = datetime.now()
    due_reminders = list(db.reminders.find({
        "status": "Pending",
        "scheduled_time": {"$lte": now}
    }))
    
    count = 0
    for reminder in due_reminders:
        send_medication_reminder_task.delay(str(reminder["_id"]))
        count += 1
        
    return f"Triggered {count} due reminders."
