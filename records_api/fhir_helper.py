import uuid
from datetime import datetime

def generate_fhir_bundle(patient_id, patient_name, doctor_license, doctor_name, 
                         icd_code, icd_display, medications, clinical_notes):
    """
    Constructs a valid HL7 FHIR Bundle containing:
    1. FHIR Encounter (representing the visit)
    2. FHIR Condition (representing the diagnosis via ICD-10)
    3. FHIR MedicationRequests (representing each prescription item)
    """
    timestamp = datetime.utcnow().isoformat() + "Z"
    encounter_id = f"enc-{uuid.uuid4()}"
    condition_id = f"cond-{uuid.uuid4()}"
    
    # 1. FHIR Encounter Resource
    encounter_resource = {
        "resourceType": "Encounter",
        "id": encounter_id,
        "status": "finished",
        "class": {
            "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
            "code": "AMB",
            "display": "ambulatory"
        },
        "subject": {
            "reference": f"Patient/{patient_id}",
            "display": patient_name
        },
        "participant": [{
            "type": [{
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                    "code": "PPRF",
                    "display": "primary performer"
                }]
            }],
            "individual": {
                "reference": f"Practitioner/{doctor_license}",
                "display": doctor_name
            }
        }],
        "period": {
            "start": timestamp,
            "end": timestamp
        },
        "reasonCode": [{
            "text": clinical_notes
        }]
    }

    # 2. FHIR Condition Resource (Diagnosis)
    condition_resource = {
        "resourceType": "Condition",
        "id": condition_id,
        "clinicalStatus": {
            "coding": [{
                "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                "code": "active"
            }]
        },
        "verificationStatus": {
            "coding": [{
                "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
                "code": "confirmed"
            }]
        },
        "category": [{
            "coding": [{
                "system": "http://terminology.hl7.org/CodeSystem/condition-category",
                "code": "encounter-diagnosis",
                "display": "Encounter Diagnosis"
            }]
        }],
        "code": {
            "coding": [{
                "system": "http://hl7.org/fhir/sid/icd-10",
                "code": icd_code,
                "display": icd_display
            }],
            "text": icd_display
        },
        "subject": {
            "reference": f"Patient/{patient_id}",
            "display": patient_name
        },
        "encounter": {
            "reference": f"Encounter/{encounter_id}"
        },
        "recordedDate": timestamp
    }

    # Build entry list
    entry_list = [
        {
            "fullUrl": f"urn:uuid:{encounter_id}",
            "resource": encounter_resource
        },
        {
            "fullUrl": f"urn:uuid:{condition_id}",
            "resource": condition_resource
        }
    ]

    # 3. FHIR MedicationRequest Resources (Prescriptions)
    for med in medications:
        medreq_id = f"medreq-{uuid.uuid4()}"
        medication_resource = {
            "resourceType": "MedicationRequest",
            "id": medreq_id,
            "status": "active",
            "intent": "order",
            "medicationCodeableConcept": {
                "text": med.get("name", "Unknown Medication")
            },
            "subject": {
                "reference": f"Patient/{patient_id}",
                "display": patient_name
            },
            "encounter": {
                "reference": f"Encounter/{encounter_id}"
            },
            "requester": {
                "reference": f"Practitioner/{doctor_license}",
                "display": doctor_name
            },
            "dosageInstruction": [{
                "text": f"{med.get('dosage', '')} - {med.get('frequency', '')}"
            }]
        }
        entry_list.append({
            "fullUrl": f"urn:uuid:{medreq_id}",
            "resource": medication_resource
        })

    # FHIR Bundle
    fhir_bundle = {
        "resourceType": "Bundle",
        "id": f"bundle-{uuid.uuid4()}",
        "type": "collection",
        "timestamp": timestamp,
        "entry": entry_list
    }

    return fhir_bundle
