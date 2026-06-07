import time
import threading
from datetime import datetime
from caresync_core.mongodb import db
from companion.twilio_service import send_alert

class LiveSchedulerWorker(threading.Thread):
    def __init__(self):
        super().__init__()
        self.daemon = True  # Daemon thread shuts down automatically when main process exits
        self.running = True
        print("[LiveScheduler] Background Worker initialized.")

    def run(self):
        print("[LiveScheduler] Background Worker thread has started polling MongoDB...")
        while self.running:
            try:
                now = datetime.now()
                # Query MongoDB for pending reminders scheduled for now or in the past
                due_reminders = list(db.reminders.find({
                    "status": "Pending",
                    "scheduled_time": {"$lte": now}
                }))
                
                if due_reminders:
                    print(f"[LiveScheduler] Found {len(due_reminders)} due medication reminders. Processing...")
                    
                for reminder in due_reminders:
                    patient_id = reminder.get("patient_id")
                    patient = db.patients.find_one({"_id": patient_id})
                    
                    if not patient:
                        print(f"[LiveScheduler] Error: Patient {patient_id} not found for reminder {reminder['_id']}")
                        db.reminders.update_one(
                            {"_id": reminder["_id"]},
                            {"$set": {"status": "Failed", "error": "Patient not found"}}
                        )
                        continue
                        
                    # Dispatch alert
                    send_alert(
                        patient_phone=patient.get("phone", ""),
                        patient_name=patient.get("name", "Patient"),
                        medication_name=reminder.get("medication_name", ""),
                        dosage=reminder.get("dosage", "1 tablet"),
                        reminder_time=reminder["scheduled_time"].strftime("%I:%M %p"),
                        reminder_id=str(reminder["_id"])
                    )
                    
            except Exception as e:
                print(f"[LiveScheduler] Error in background worker loop: {e}")
                
            # Sleep for 10 seconds before next poll
            time.sleep(10)

# Single instance placeholder
_worker_instance = None
_worker_lock = threading.Lock()

def start_worker():
    """
    Thread-safe activation of the background worker daemon.
    """
    global _worker_instance
    with _worker_lock:
        if _worker_instance is None:
            _worker_instance = LiveSchedulerWorker()
            _worker_instance.start()
            print("[LiveScheduler] Background Worker thread successfully launched!")
        else:
            print("[LiveScheduler] Background Worker is already running.")
