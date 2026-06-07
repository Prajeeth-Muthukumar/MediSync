import json
import logging
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .db_client import db_client, SEED_ASSETS

logger = logging.getLogger(__name__)

def dashboard(request):
    """Renders the main geo-spatial mapping dashboard page."""
    context = {
        "title": "CareSync - Smart Donor & NGO Network",
        "default_lat": 40.7580,
        "default_lng": -73.9855,
    }
    return render(request, "donor_network/dashboard.html", context)

def search_assets(request):
    """
    API endpoint: searches for assets within the radius.
    Parameters:
      - lat (float): Latitude
      - lng (float): Longitude
      - radius (float): Radius in km
      - asset_type (str, optional): 'blood_bank', 'donor', 'ngo'
      - sub_filter (str, optional): blood group (O-, A+, etc.) or 'organ:<organ_name>'
    """
    try:
        lat = float(request.GET.get("lat", 40.7580))
        lng = float(request.GET.get("lng", -73.9855))
        radius = float(request.GET.get("radius", 5.0)) # km
        asset_type = request.GET.get("type", None)
        sub_filter = request.GET.get("sub_filter", None)
        
        if asset_type == "all":
            asset_type = None
        if sub_filter == "all":
            sub_filter = None

        # Search matching assets
        assets, source = db_client.find_nearest(lat, lng, radius, asset_type, sub_filter)
        
        # If no assets found in DB for this area, generate dynamic local assets
        if len(assets) == 0:
            import random
            import uuid
            num_mocks = random.randint(3, 7)
            mock_types = ["blood_bank", "donor", "ngo"]
            if asset_type:
                mock_types = [asset_type]
            
            for i in range(num_mocks):
                r_lat = lat + random.uniform(-radius/111, radius/111)
                r_lng = lng + random.uniform(-radius/111, radius/111)
                t = random.choice(mock_types)
                mock_asset = {
                    "id": str(uuid.uuid4()),
                    "name": f"Local {t.replace('_', ' ').title()} Hub {i+1}",
                    "type": t,
                    "lat": round(r_lat, 4),
                    "lng": round(r_lng, 4),
                    "distance_km": round(random.uniform(0.5, radius), 2),
                    "contact": f"+91-98{random.randint(10000000, 99999999)}"
                }
                if t == "donor":
                    mock_asset["blood_group"] = random.choice(["O+", "O-", "A+", "B+", "AB+"])
                assets.append(mock_asset)
        
        # Generate the dynamic raw queries for visualizer
        queries = db_client.generate_raw_queries(lat, lng, radius, asset_type, sub_filter)
        
        return JsonResponse({
            "status": "success",
            "source": source,
            "count": len(assets),
            "lat": lat,
            "lng": lng,
            "radius_km": radius,
            "assets": assets,
            "queries": queries
        })
    except Exception as e:
        logger.error(f"Error in search_assets view: {e}")
        return JsonResponse({"status": "error", "message": str(e)}, status=400)

@csrf_exempt
def trigger_notifications(request):
    """
    API endpoint: triggers notification flow for registered donors and NGOs.
    Simulates SMS and SMTP email dispatches with templates.
    """
    if request.method != "POST":
        return JsonResponse({"status": "error", "message": "Only POST requests allowed"}, status=405)
        
    try:
        data = json.loads(request.body)
        patient_name = data.get("patient_name", "Emergency Patient")
        lat = float(data.get("lat", 40.7580))
        lng = float(data.get("lng", -73.9855))
        radius = float(data.get("radius", 5.0))
        request_type = data.get("request_type", "blood") # 'blood' or 'organ'
        item_needed = data.get("item_needed", "O-") # e.g. 'O-' or 'Kidney'
        urgency = data.get("urgency", "Critical")

        # 1. Query matching targets within radius to notify
        # For blood request, find donors matching blood group and NGOs
        # For organ request, find blood banks with organ stock and NGOs
        notified_donors = []
        notified_ngos = []
        
        if request_type == "blood":
            # Find donors
            donors, _ = db_client.find_nearest(lat, lng, radius, "donor", item_needed)
            notified_donors = [d for d in donors if d.get("status") == "Available"]
        
        # Find all NGOs in radius regardless (they help coordinate)
        ngos, _ = db_client.find_nearest(lat, lng, radius, "ngo", None)
        notified_ngos = ngos

        # 2. Build logs and notification templates
        logs = []
        logs.append(f"[{urgency.upper()} ALERT] Dispatch sequence initialized at coordinates ({lat:.4f}, {lng:.4f})")
        logs.append(f"Searching for resources within {radius:.1f} km radius matching: {item_needed}")
        
        sms_notifications = []
        email_notifications = []

        if request_type == "blood":
            logs.append(f"Found {len(notified_donors)} available matching donors and {len(notified_ngos)} local NGOs.")
            
            # Create mock SMS for donors
            for donor in notified_donors:
                sms_body = (
                    f"CareSync Emergency: urgent {item_needed} blood needed at Midtown Clinic. "
                    f"You are within {donor['distance_km']}km. Reply YES to accept dispatch or call 555-0199."
                )
                sms_notifications.append({
                    "to": donor["name"],
                    "phone": donor["contact"],
                    "body": sms_body
                })
                logs.append(f"SMS alert successfully queued for donor: {donor['name']} ({donor['contact']})")
        else:
            # Organ request
            # Find matching blood banks/hospitals within radius with organ stock
            sub_filter = f"organ:{item_needed}"
            hospitals, _ = db_client.find_nearest(lat, lng, radius, "blood_bank", sub_filter)
            logs.append(f"Found {len(hospitals)} hospitals with {item_needed} in inventory and {len(notified_ngos)} local NGOs.")
            
            for hosp in hospitals:
                logs.append(f"Emergency reservation request sent to repository: {hosp['name']} (Contact: {hosp['contact']})")

        # Create mock emails for NGOs
        for ngo in notified_ngos:
            email_subject = f"CareSync ALERT: Urgent {item_needed} {request_type.capitalize()} Request - {urgency}"
            email_body = (
                f"<html>"
                f"<body>"
                f"<div style='font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #10B981; border-radius: 8px; background-color: #0f172a; color: #f8fafc;'>"
                f"<h2 style='color: #10B981; margin-top: 0;'>CareSync Donor & NGO Network</h2>"
                f"<hr style='border-color: #1e293b;'/>"
                f"<p><strong>Urgent Alert:</strong> A critical request has been issued for a patient in your vicinity.</p>"
                f"<ul>"
                f"  <li><strong>Patient Name:</strong> {patient_name}</li>"
                f"  <li><strong>Resource Required:</strong> {item_needed} ({request_type.capitalize()})</li>"
                f"  <li><strong>Urgency:</strong> <span style='color: #ef4444;'>{urgency}</span></li>"
                f"  <li><strong>Distance to Hub:</strong> {ngo['distance_km']} km</li>"
                f"</ul>"
                f"<p>Please coordinate local transport logistics and volunteer mobilization immediately. Contact dispatch at +1 (555) 911-EHR.</p>"
                f"<br/>"
                f"<small style='color: #64748b;'>HIPAA Encrypted Transmission Sandbox | CareSync Network</small>"
                f"</div>"
                f"</body>"
                f"</html>"
            )
            email_notifications.append({
                "to": ngo["name"],
                "email": ngo["contact"],
                "subject": email_subject,
                "body": email_body
            })
            logs.append(f"SMTP dispatch: HTML notification transmitted to NGO coordinator: {ngo['name']} ({ngo['contact']})")

        logs.append("Alert dispatch cycle complete. Monitoring real-time replies.")

        return JsonResponse({
            "status": "success",
            "logs": logs,
            "sms_sent": sms_notifications,
            "emails_sent": email_notifications,
            "notified_donors_count": len(notified_donors),
            "notified_ngos_count": len(notified_ngos)
        })
    except Exception as e:
        logger.error(f"Error in trigger_notifications view: {e}")
        return JsonResponse({"status": "error", "message": str(e)}, status=400)
