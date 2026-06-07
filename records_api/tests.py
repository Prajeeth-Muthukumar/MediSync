from django.test import TestCase, RequestFactory
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
import json

from .verification_service import verify_doctor_license
from .fhir_helper import generate_fhir_bundle
from .db_connection import users_collection, consents_collection, encounters_collection

class CareSyncTests(TestCase):
    def setUp(self):
        # We use an API client for endpoint tests
        self.client = APIClient()

        # Clean fallback database structures for testing (safely resets test records)
        users_collection.delete_many({})
        consents_collection.delete_many({})
        encounters_collection.delete_many({})

        # Register a verified doctor in mock database
        self.doctor_user = {
            "username": "dr_jenkins",
            "password": "password123",
            "role": "doctor",
            "name": "Dr. Sarah Jenkins",
            "license_number": "DOC-CARDIO-001",
            "specialty": "Cardiology",
            "is_verified": True
        }
        users_collection.insert_one(self.doctor_user)

        # Register a patient in mock database
        self.patient_user = {
            "username": "pat_john",
            "password": "password123",
            "role": "patient",
            "patient_id": "P-1001",
            "name": "John Doe",
            "gender": "male",
            "birth_date": "1985-05-12"
        }
        users_collection.insert_one(self.patient_user)

    def test_doctor_license_verification(self):
        """Test Doctor registry validation rules."""
        # 1. Valid Active License
        res1 = verify_doctor_license("DOC-CARDIO-001")
        self.assertTrue(res1["is_valid"])
        self.assertEqual(res1["doctor_details"]["doctor_name"], "Dr. Sarah Jenkins")
        self.assertEqual(res1["doctor_details"]["specialty"], "Cardiology")

        # 2. Suspended License
        res2 = verify_doctor_license("DOC-ONCO-005")
        self.assertFalse(res2["is_valid"])
        self.assertIn("Suspended", res2["error_message"])

        # 3. Unrecognized/Invalid License
        res3 = verify_doctor_license("BAD-LICENSE-999")
        self.assertFalse(res3["is_valid"])
        self.assertIn("not found", res3["error_message"].lower())

    def test_fhir_bundle_generator(self):
        """Test that user clinical inputs are structured into standard HL7 FHIR formats."""
        meds = [{"name": "Lisinopril 10mg", "dosage": "1 tablet", "frequency": "Daily"}]
        bundle = generate_fhir_bundle(
            patient_id="P-1001",
            patient_name="John Doe",
            doctor_license="DOC-CARDIO-001",
            doctor_name="Dr. Sarah Jenkins",
            icd_code="I10",
            icd_display="Essential hypertension",
            medications=meds,
            clinical_notes="Blood pressure elevated"
        )

        self.assertEqual(bundle["resourceType"], "Bundle")
        self.assertEqual(bundle["type"], "collection")
        
        # Verify bundle entries
        entries = bundle["entry"]
        self.assertGreaterEqual(len(entries), 3) # Encounter, Condition, MedicationRequest

        # Extract resources
        encounter = entries[0]["resource"]
        condition = entries[1]["resource"]
        medreq = entries[2]["resource"]

        self.assertEqual(encounter["resourceType"], "Encounter")
        self.assertEqual(encounter["subject"]["reference"], "Patient/P-1001")

        self.assertEqual(condition["resourceType"], "Condition")
        self.assertEqual(condition["code"]["coding"][0]["code"], "I10")

        self.assertEqual(medreq["resourceType"], "MedicationRequest")
        self.assertEqual(medreq["medicationCodeableConcept"]["text"], "Lisinopril 10mg")

    def test_consent_timeline_gating(self):
        """Test API timeline retrieval is blocked/allowed based on patient consent settings."""
        # Setup: Create an EHR record under Doctor Jenkins for Patient John Doe
        meds = [{"name": "Aspirin 81mg", "dosage": "1 tab", "frequency": "Daily"}]
        bundle = generate_fhir_bundle(
            patient_id="P-1001",
            patient_name="John Doe",
            doctor_license="DOC-CARDIO-001",
            doctor_name="Dr. Sarah Jenkins",
            icd_code="I25.10",
            icd_display="Atherosclerotic heart disease",
            medications=meds,
            clinical_notes="Stable ischemic heart disease"
        )
        record = {
            "patient_id": "P-1001",
            "doctor_username": "dr_jenkins",
            "doctor_name": "Dr. Sarah Jenkins",
            "doctor_specialty": "Cardiology",
            "created_at": "2026-05-26T20:00:00Z",
            "fhir_bundle": bundle
        }
        encounters_collection.insert_one(record)

        # Doctor B (not verified, doesn't have consent) searches timeline
        # First check timeline without consent - Doctor B
        url = reverse('get_timeline')
        response = self.client.get(url, {
            "patient_id": "P-1001",
            "doctor_username": "dr_mercer", # Dr Mercer doesn't have consent
            "requester_role": "doctor"
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Grant consent to Dr. Mercer
        consents_collection.update_one(
            {"patient_id": "P-1001", "doctor_username": "dr_mercer"},
            {"$set": {"status": "granted"}},
            upsert=True
        )

        # Register Dr. Mercer (so he is a verified doctor)
        users_collection.insert_one({
            "username": "dr_mercer",
            "password": "password123",
            "role": "doctor",
            "name": "Dr. Alan Mercer",
            "license_number": "DOC-PEDIAT-002",
            "specialty": "Pediatrics",
            "is_verified": True
        })

        # Fetch timeline again - Doctor B (Mercer) should now succeed
        response = self.client.get(url, {
            "patient_id": "P-1001",
            "doctor_username": "dr_mercer",
            "requester_role": "doctor"
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["timeline"]), 1)

        # Revoke consent
        consents_collection.update_one(
            {"patient_id": "P-1001", "doctor_username": "dr_mercer"},
            {"$set": {"status": "revoked"}}
        )

        # Fetch timeline again - Doctor B should be blocked
        response = self.client.get(url, {
            "patient_id": "P-1001",
            "doctor_username": "dr_mercer",
            "requester_role": "doctor"
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
