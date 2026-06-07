import requests
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import logging
import random

logger = logging.getLogger(__name__)

@api_view(['GET'])
def get_nearby_blood_banks(request):
    """
    Fetches real hospitals nearby using OpenStreetMap Overpass API.
    Dynamically attaches mock blood inventory to simulate live data.
    Expects 'lat' and 'lng' query parameters.
    """
    lat = request.GET.get('lat')
    lng = request.GET.get('lng')

    if not lat or not lng:
        return Response({"error": "Latitude and Longitude are required."}, status=status.HTTP_400_BAD_REQUEST)

    # Overpass QL Query to find hospitals and blood banks within 5000 meters
    query = f"""
    [out:json];
    (
      node["amenity"="hospital"](around:5000, {lat}, {lng});
      node["healthcare"="blood_bank"](around:5000, {lat}, {lng});
    );
    out 10;
    """

    headers = {
        'User-Agent': 'CareSync/1.0 (Integration Testing)'
    }

    try:
        response = requests.get('https://overpass-api.de/api/interpreter', params={'data': query}, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            elements = data.get('elements', [])
            
            formatted_banks = []
            
            for idx, node in enumerate(elements):
                tags = node.get('tags', {})
                name = tags.get('name', 'Local Hospital / Clinic')
                
                # Mock live blood availability
                mock_availability = random.sample(["A+", "B+", "O+", "O-", "AB+", "AB-"], k=random.randint(2, 5))
                
                formatted_banks.append({
                    "id": f"osm_{node.get('id', idx)}",
                    "name": name,
                    "distance": f"{round(random.uniform(0.5, 5.0), 1)} km", # Overpass doesn't return distance directly in this simple query, so we mock it
                    "type": "Verified Hospital",
                    "available": mock_availability,
                    "lat": float(node.get('lat', 0)),
                    "lng": float(node.get('lon', 0)),
                    "isExternal": True
                })

            if not formatted_banks:
                return Response({"blood_banks": [], "message": "No hospitals found nearby on OpenStreetMap"}, status=status.HTTP_200_OK)

            return Response({"blood_banks": formatted_banks}, status=status.HTTP_200_OK)
            
        else:
            logger.error(f"OSM Overpass API returned {response.status_code}")
            return Response({"error": f"OpenStreetMap API error ({response.status_code})", "blood_banks": []}, status=status.HTTP_502_BAD_GATEWAY)

    except requests.exceptions.Timeout:
        logger.warning("OSM API timed out.")
        return Response({"error": "Connection to OpenStreetMap timed out.", "blood_banks": []}, status=status.HTTP_504_GATEWAY_TIMEOUT)
    except Exception as e:
        logger.error(f"OSM request failed: {e}")
        return Response({"error": "Failed to communicate with OpenStreetMap.", "blood_banks": []}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
