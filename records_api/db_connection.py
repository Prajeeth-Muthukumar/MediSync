import os
import json
import uuid
import datetime
import pymongo
from django.conf import settings

# Determine database paths for fallback
FALLBACK_DIR = os.path.join(settings.BASE_DIR, "db_json")
os.makedirs(FALLBACK_DIR, exist_ok=True)

class JSONFallbackCollection:
    def __init__(self, name):
        self.name = name
        self.filepath = os.path.join(FALLBACK_DIR, f"{name}.json")
        self._ensure_file()

    def _ensure_file(self):
        if not os.path.exists(self.filepath):
            self._write([])

    def _read(self):
        try:
            with open(self.filepath, "r") as f:
                return json.load(f)
        except Exception:
            return []

    def _write(self, data):
        with open(self.filepath, "w") as f:
            json.dump(data, f, indent=2)

    def _matches(self, doc, query):
        if not query:
            return True
        for k, v in query.items():
            if k == "$or":
                # v is a list of sub-queries
                if not any(self._matches(doc, q) for q in v):
                    return False
            elif k == "$and":
                if not all(self._matches(doc, q) for q in v):
                    return False
            else:
                # Direct match
                # Handle nested dicts or simple comparison
                if doc.get(k) != v:
                    return False
        return True

    def find_one(self, query=None):
        data = self._read()
        for doc in data:
            if self._matches(doc, query):
                return doc
        return None

    def find(self, query=None, projection=None, *args, **kwargs):
        data = self._read()
        results = [doc for doc in data if self._matches(doc, query)]
        
        if projection:
            cleaned_results = []
            for doc in results:
                new_doc = doc.copy()
                for k, v in projection.items():
                    if v == 0 and k in new_doc:
                        del new_doc[k]
                cleaned_results.append(new_doc)
            results = cleaned_results
        
        # Return a chainable helper for sort
        class Cursor(list):
            def sort(self, key, direction=1):
                # pymongo.DESCENDING is -1, ASCENDING is 1
                reverse = True if direction == -1 else False
                # E.g. key = "created_at"
                def sort_key(doc):
                    return doc.get(key, "")
                sorted_list = sorted(self, key=sort_key, reverse=reverse)
                return sorted_list
        return Cursor(results)

    def insert_one(self, document):
        data = self._read()
        if "_id" not in document:
            document["_id"] = str(uuid.uuid4())
        data.append(document)
        self._write(data)
        return document

    def insert_many(self, documents):
        data = self._read()
        for doc in documents:
            if "_id" not in doc:
                doc["_id"] = str(uuid.uuid4())
            data.append(doc)
        self._write(data)
        return documents

    def update_one(self, filter_query, update_operation, upsert=False):
        data = self._read()
        found = False
        
        # Extract $set operations
        set_data = update_operation.get("$set", {})

        for doc in data:
            if self._matches(doc, filter_query):
                doc.update(set_data)
                found = True
                break

        if not found and upsert:
            new_doc = {}
            new_doc.update(filter_query)
            new_doc.update(set_data)
            if "_id" not in new_doc:
                new_doc["_id"] = str(uuid.uuid4())
            data.append(new_doc)
            self._write(data)
            return new_doc

        self._write(data)
        return {"matched_count": 1 if found else 0}

    def count_documents(self, query=None):
        data = self._read()
        count = 0
        for doc in data:
            if self._matches(doc, query):
                count += 1
        return count

    def create_index(self, *args, **kwargs):
        # Index creation is a no-op in JSON fallback database
        return None


# Attempt connection to MongoDB
from caresync_core.mongodb import db_client as unified_client, db as unified_db

MONGO_AVAILABLE = False

try:
    if unified_client.connected:
        db = unified_db
        users_collection = db["users"]
        encounters_collection = db["encounters"]
        consents_collection = db["consents"]
        appointments_collection = db["appointments"]
        medical_registry_collection = db["medical_registry"]
        notifications_collection = db["notifications"]
        MONGO_AVAILABLE = True
        print("[Database] Connected successfully to local MongoDB instance via unified client.")
    else:
        raise Exception("Unified MongoDB client is not connected")
except Exception as e:
    print(f"[Database Warning] MongoDB is offline or unreachable ({e}). Falling back to local JSON database files.")
    
    users_collection = JSONFallbackCollection("users")
    encounters_collection = JSONFallbackCollection("encounters")
    consents_collection = JSONFallbackCollection("consents")
    appointments_collection = JSONFallbackCollection("appointments")
    medical_registry_collection = JSONFallbackCollection("medical_registry")
    notifications_collection = JSONFallbackCollection("notifications")

def seed_database():
    """
    Seeds initial medical license registry values and common configurations 
    if they are not already populated.
    """
    # 1. Seed Medical License Registry
    if medical_registry_collection.count_documents({}) == 0:
        mock_registry = [
            {
                "license_number": "DOC-CARDIO-001",
                "doctor_name": "Dr. John Smith",
                "specialty": "Cardiology",
                "status": "Active",
                "issuing_authority": "National Medical Council"
            },
            {
                "license_number": "DOC-PEDIAT-002",
                "doctor_name": "Dr. Alan Mercer",
                "specialty": "Pediatrics",
                "status": "Active",
                "issuing_authority": "National Medical Council"
            },
            {
                "license_number": "DOC-NEURO-003",
                "doctor_name": "Dr. Sarah Jones",
                "specialty": "Neurology",
                "status": "Active",
                "issuing_authority": "National Medical Council"
            },
            {
                "license_number": "DOC-GENPRAC-004",
                "doctor_name": "Dr. Marcus Vance",
                "specialty": "General Practice",
                "status": "Active",
                "issuing_authority": "National Medical Council"
            },
            {
                "license_number": "DOC-ONCO-005",
                "doctor_name": "Dr. Kenji Tanaka",
                "specialty": "Oncology",
                "status": "Suspended",  # Used to test a suspended license case
                "issuing_authority": "National Medical Council"
            }
        ]
        medical_registry_collection.insert_many(mock_registry)
        print("[Database Seeding] Populated mock medical license registry.")

    # 2. Seed a default patient if no patients exist
    if users_collection.count_documents({"role": "patient"}) == 0:
        default_patient = {
            "username": "pat_john",
            "password": "password123",
            "role": "patient",
            "patient_id": "P-1001",
            "name": "John Doe",
            "gender": "male",
            "birth_date": "1985-05-12",
            "telecom": "+1-555-0199",
            "address": "123 Health Ave, Boston, MA"
        }
        users_collection.insert_one(default_patient)
        print("[Database Seeding] Populated sample patient John Doe (P-1001 / username: pat_john).")

    # 3. Create Indexes (only if Mongo is active)
    if MONGO_AVAILABLE:
        users_collection.create_index("username", unique=True)
        users_collection.create_index("patient_id", unique=True, sparse=True)
        medical_registry_collection.create_index("license_number", unique=True)
        consents_collection.create_index([("patient_id", 1), ("doctor_username", 1)], unique=True)
        appointments_collection.create_index([("doctor_username", 1), ("time_slot", 1)])

# Run seeding function when this module is imported to ensure DB state
try:
    seed_database()
except Exception as e:
    print(f"[Database Error] Seeding failed: {e}")
