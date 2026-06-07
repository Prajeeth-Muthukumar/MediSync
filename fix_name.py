import sys
import os
import json

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'caresync_core.settings')

import django
django.setup()

from records_api.db_connection import users_collection

print("Fixing dr_smith's name in the database...")

# Update dr_smith's name to Dr. John Smith
result = users_collection.update_one(
    {"username": "dr_smith"},
    {"$set": {"name": "Dr. John Smith"}}
)

if hasattr(result, "get"):
    # JSON fallback dictionary response
    if result.get("matched_count", 0) > 0:
        print("Successfully updated Dr. John Smith in the JSON fallback database!")
    else:
        print("User dr_smith not found in JSON fallback database.")
else:
    # PyMongo response
    if result.matched_count > 0:
        print("Successfully updated Dr. John Smith in MongoDB!")
    else:
        print("User dr_smith not found in MongoDB.")

print("Done! You can now log out and log back in.")
