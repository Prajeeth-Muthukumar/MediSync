import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'caresync_core.settings')

import django
django.setup()

from caresync_core.mongodb import db_client
import uuid
import datetime

db = db_client.db

def seed():
    print("Clearing old users...")
    db.users.delete_many({})
    
    print("Seeding Doctors...")
    doctors = [
        {
            "username": "dr_smith",
            "password": "password123",
            "role": "doctor",
            "name": "Dr. John Smith",
            "license_number": "DOC-CARDIO-001",
            "specialty": "Cardiology",
            "is_verified": True,
            "verified_at": datetime.datetime.utcnow().isoformat() + "Z"
        },
        {
            "username": "dr_jones",
            "password": "password123",
            "role": "doctor",
            "name": "Dr. Sarah Jones",
            "license_number": "DOC-NEURO-003",
            "specialty": "Neurology",
            "is_verified": True,
            "verified_at": datetime.datetime.utcnow().isoformat() + "Z"
        }
    ]
    db.users.insert_many(doctors)
    print(f"Inserted {len(doctors)} doctors.")

    print("Seeding Patients...")
    patients = [
        {
            "username": "pat_alice",
            "password": "password123",
            "role": "patient",
            "patient_id": f"P-{uuid.uuid4().hex[:6].upper()}",
            "name": "Alice Cooper",
            "gender": "female",
            "birth_date": "1985-04-12",
            "telecom": "+1-555-0100",
            "address": "123 Elm St, NY"
        },
        {
            "username": "pat_bob",
            "password": "password123",
            "role": "patient",
            "patient_id": f"P-{uuid.uuid4().hex[:6].upper()}",
            "name": "Bob Dylan",
            "gender": "male",
            "birth_date": "1970-09-21",
            "telecom": "+1-555-0200",
            "address": "456 Oak Ave, CA"
        }
    ]
    db.users.insert_many(patients)
    print(f"Inserted {len(patients)} patients.")
    print("\n===============================")
    print("Seed complete! You can now log in with:")
    print("Doctor:  username='dr_smith'  | password='password123'")
    print("Patient: username='pat_alice' | password='password123'")
    print("===============================\n")

if __name__ == '__main__':
    seed()
