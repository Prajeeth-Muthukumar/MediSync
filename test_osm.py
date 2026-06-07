import requests
import json

query = """
[out:json];
(
  node["amenity"="hospital"](around:5000, 28.6139, 77.2090);
  node["healthcare"="blood_bank"](around:5000, 28.6139, 77.2090);
);
out 5;
"""

try:
    headers = {'User-Agent': 'CareSync/1.0 (Integration Testing)'}
    res = requests.get('https://overpass-api.de/api/interpreter', params={'data': query}, headers=headers)
    print("Status:", res.status_code)
    print("Response:", res.text[:500])
except Exception as e:
    print(e)
