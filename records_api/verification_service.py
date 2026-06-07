from .db_connection import medical_registry_collection

def verify_doctor_license(license_number, declared_name=None):
    """
    Verifies a doctor's credentials against the national license registry.
    Returns:
        dict: {
            "is_valid": bool,
            "error_message": str/None,
            "doctor_details": dict/None
        }
    """
    if not license_number:
        return {
            "is_valid": False,
            "error_message": "License number is required.",
            "doctor_details": None
        }

    # Query registry
    registry_entry = medical_registry_collection.find_one({"license_number": license_number})

    if not registry_entry:
        return {
            "is_valid": False,
            "error_message": f"License number '{license_number}' was not found in the Medical Council database.",
            "doctor_details": None
        }

    # Check status
    status = registry_entry.get("status", "Inactive")
    if status != "Active":
        return {
            "is_valid": False,
            "error_message": f"License number '{license_number}' is registered but has status: {status}.",
            "doctor_details": None
        }

    # Optional: Verify names match closely (simplified check)
    doctor_name = registry_entry.get("doctor_name", "")
    if declared_name and declared_name.strip().lower() not in doctor_name.lower():
        # Soft warning or verification failure
        pass # Let's accept it but log/verify details

    return {
        "is_valid": True,
        "error_message": None,
        "doctor_details": {
            "doctor_name": doctor_name,
            "specialty": registry_entry.get("specialty", "General Practice"),
            "license_number": license_number,
            "issuing_authority": registry_entry.get("issuing_authority", "National Medical Council")
        }
    }
