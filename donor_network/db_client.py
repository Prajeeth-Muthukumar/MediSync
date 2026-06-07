import math
import logging
from caresync_core.mongodb import db_client as core_db_client, haversine_distance

logger = logging.getLogger(__name__)

# Coordinates centered in Midtown Manhattan, New York (lat: 40.7580, lng: -73.9855)
# Seed data for assets (Blood Banks, Donors, NGOs)
SEED_ASSETS = [
    # Blood Banks / Hospitals
    {
        "id": "bb-1",
        "name": "Midtown Clinical Blood Bank",
        "type": "blood_bank",
        "lat": 28.6149,
        "lng": 77.2125,
        "contact": "+1 (555) 120-4321",
        "inventory": {"O-": 12, "O+": 25, "A-": 8, "A+": 30, "B-": 4, "B+": 18, "AB-": 2, "AB+": 9},
        "organ_stock": {"Cornea": 2, "Skin Patch": 5}
    },
    {
        "id": "bb-2",
        "name": "Bellevue Medical Center Transfusion Unit",
        "type": "blood_bank",
        "lat": 28.5949,
        "lng": 77.2185,
        "contact": "+1 (555) 345-0987",
        "inventory": {"O-": 4, "O+": 40, "A-": 15, "A+": 35, "B-": 9, "B+": 22, "AB-": 6, "AB+": 15},
        "organ_stock": {"Kidney": 1, "Liver": 1}
    },
    {
        "id": "bb-3",
        "name": "Mount Sinai Hospital Donor Center",
        "type": "blood_bank",
        "lat": 28.6459,
        "lng": 77.2415,
        "contact": "+1 (555) 987-6543",
        "inventory": {"O-": 18, "O+": 50, "A-": 20, "A+": 45, "B-": 12, "B+": 30, "AB-": 5, "AB+": 20},
        "organ_stock": {"Heart": 1, "Kidney": 2, "Cornea": 4}
    },
    {
        "id": "bb-4",
        "name": "Weill Cornell Emergency Blood Repository",
        "type": "blood_bank",
        "lat": 28.6199,
        "lng": 77.2405,
        "contact": "+1 (555) 654-3210",
        "inventory": {"O-": 2, "O+": 15, "A-": 4, "A+": 18, "B-": 1, "B+": 10, "AB-": 0, "AB+": 5},
        "organ_stock": {"Liver": 1}
    },
    {
        "id": "bb-5",
        "name": "NYU Langone Blood Services",
        "type": "blood_bank",
        "lat": 28.5979,
        "lng": 77.2205,
        "contact": "+1 (555) 789-0123",
        "inventory": {"O-": 9, "O+": 28, "A-": 11, "A+": 24, "B-": 6, "B+": 16, "AB-": 3, "AB+": 8},
        "organ_stock": {"Cornea": 1, "Heart": 0}
    },
    # Registered Donors
    {
        "id": "donor-1",
        "name": "Alex Mercer",
        "type": "donor",
        "lat": 28.6179,
        "lng": 77.2025,
        "blood_group": "O-",
        "contact": "+1 (555) 234-5678",
        "status": "Available"
    },
    {
        "id": "donor-2",
        "name": "Sarah Connor",
        "type": "donor",
        "lat": 28.6079,
        "lng": 77.2225,
        "blood_group": "A+",
        "contact": "+1 (555) 345-6789",
        "status": "Available"
    },
    {
        "id": "donor-3",
        "name": "Bruce Wayne",
        "type": "donor",
        "lat": 28.6339,
        "lng": 77.2325,
        "blood_group": "AB+",
        "contact": "+1 (555) 456-7890",
        "status": "Available"
    },
    {
        "id": "donor-4",
        "name": "Diana Prince",
        "type": "donor",
        "lat": 28.6009,
        "lng": 77.1965,
        "blood_group": "O-",
        "contact": "+1 (555) 567-8901",
        "status": "Available"
    },
    {
        "id": "donor-5",
        "name": "Barry Allen",
        "type": "donor",
        "lat": 28.5839,
        "lng": 77.2035,
        "blood_group": "B+",
        "contact": "+1 (555) 678-9012",
        "status": "Available"
    },
    {
        "id": "donor-6",
        "name": "Clark Kent",
        "type": "donor",
        "lat": 28.6409,
        "lng": 77.2165,
        "blood_group": "O+",
        "contact": "+1 (555) 789-0123",
        "status": "Busy"
    },
    {
        "id": "donor-7",
        "name": "Selina Kyle",
        "type": "donor",
        "lat": 28.6239,
        "lng": 77.2055,
        "blood_group": "A-",
        "contact": "+1 (555) 890-1234",
        "status": "Available"
    },
    {
        "id": "donor-8",
        "name": "Hal Jordan",
        "type": "donor",
        "lat": 28.5909,
        "lng": 77.2265,
        "blood_group": "O-",
        "contact": "+1 (555) 901-2345",
        "status": "Available"
    },
    # Registered NGOs
    {
        "id": "ngo-1",
        "name": "Metro Health Support Circle",
        "type": "ngo",
        "lat": 28.6209,
        "lng": 77.2195,
        "contact": "support@metrohealth.org",
        "focus": "Emergency blood mobilization & volunteer dispatch"
    },
    {
        "id": "ngo-2",
        "name": "Hope Organ Transplants Network",
        "type": "ngo",
        "lat": 28.6039,
        "lng": 77.2055,
        "contact": "alert@hopeorgan.org",
        "focus": "Organ donor outreach, family consent logistics"
    },
    {
        "id": "ngo-3",
        "name": "Red Cross Manhattan Hub",
        "type": "ngo",
        "lat": 28.6269,
        "lng": 77.2335,
        "contact": "bloodserv@redcross-ny.org",
        "focus": "Disaster relief, mega blood-drives, cold storage mobilization"
    },
    {
        "id": "ngo-4",
        "name": "Community Care Alliance",
        "type": "ngo",
        "lat": 28.5779,
        "lng": 77.2125,
        "contact": "dispatch@commcare.org",
        "focus": "Local health clinics assistance, home donor pickup"
    }
]

class LegacyDonorDBClient:
    def __init__(self):
        self._ensure_indexes_and_seed()

    @property
    def db(self):
        return core_db_client.db
        
    @property
    def connected(self):
        return core_db_client.connected

    def _ensure_indexes_and_seed(self):
        if not self.connected:
            return
            
        assets_col = self.db['assets_in']
        
        # 1. Create a 2dsphere index on the 'location' field
        assets_col.create_index([("location", "2dsphere")])
        
        # 2. Seed database if it is empty
        if assets_col.count_documents({}) == 0:
            seed_docs = []
            for asset in SEED_ASSETS:
                doc = asset.copy()
                doc["location"] = {
                    "type": "Point",
                    "coordinates": [asset["lng"], asset["lat"]]
                }
                seed_docs.append(doc)
            assets_col.insert_many(seed_docs)
            logger.info(f"Seeded MongoDB with {len(seed_docs)} assets.")

    def find_nearest(self, lat, lng, radius_km, asset_type=None, sub_filter=None):
        radius_meters = radius_km * 1000.0
        
        if self.connected:
            query = {
                "location": {
                    "$nearSphere": {
                        "$geometry": {
                            "type": "Point",
                            "coordinates": [lng, lat]
                        },
                        "$maxDistance": radius_meters
                    }
                }
            }
            
            if asset_type:
                query["type"] = asset_type
                if asset_type == "donor" and sub_filter:
                    query["blood_group"] = sub_filter
                elif asset_type == "blood_bank" and sub_filter:
                    if sub_filter.startswith("organ:"):
                        organ_name = sub_filter.split(":")[1]
                        query[f"organ_stock.{organ_name}"] = {"$gt": 0}
                    else:
                        query[f"inventory.{sub_filter}"] = {"$gt": 0}
            
            try:
                results = []
                cursor = self.db['assets_in'].find(query)
                for doc in cursor:
                    dist = haversine_distance(lat, lng, doc["lat"], doc["lng"])
                    doc_copy = dict(doc)
                    if '_id' in doc_copy:
                        doc_copy['_id'] = str(doc_copy['_id'])
                    doc_copy['distance_km'] = round(dist, 2)
                    results.append(doc_copy)
                return results, "mongodb"
            except Exception as e:
                logger.error(f"Error querying MongoDB: {e}. Falling back to simulation.")
                
        return self._simulate_find_nearest(lat, lng, radius_km, asset_type, sub_filter)

    def _simulate_find_nearest(self, lat, lng, radius_km, asset_type=None, sub_filter=None):
        results = []
        for asset in SEED_ASSETS:
            if asset_type and asset["type"] != asset_type:
                continue
            
            if asset_type == "donor" and sub_filter and asset.get("blood_group") != sub_filter:
                continue
            if asset_type == "blood_bank" and sub_filter:
                if sub_filter.startswith("organ:"):
                    organ_name = sub_filter.split(":")[1]
                    if asset.get("organ_stock", {}).get(organ_name, 0) <= 0:
                        continue
                else:
                    if asset.get("inventory", {}).get(sub_filter, 0) <= 0:
                        continue

            dist = haversine_distance(lat, lng, asset["lat"], asset["lng"])
            if dist <= radius_km:
                doc = asset.copy()
                doc["distance_km"] = round(dist, 2)
                results.append(doc)
        
        results.sort(key=lambda x: x["distance_km"])
        return results, "simulation"

    @staticmethod
    def generate_raw_queries(lat, lng, radius_km, asset_type=None, sub_filter=None):
        radius_meters = int(radius_km * 1000)
        
        mongo_query = {
            "location": {
                "$nearSphere": {
                    "$geometry": {
                        "type": "Point",
                        "coordinates": [round(lng, 5), round(lat, 5)]
                    },
                    "$maxDistance": radius_meters
                }
            }
        }
        if asset_type:
            mongo_query["type"] = asset_type
            if asset_type == "donor" and sub_filter:
                mongo_query["blood_group"] = sub_filter
            elif asset_type == "blood_bank" and sub_filter:
                if sub_filter.startswith("organ:"):
                    organ_name = sub_filter.split(":")[1]
                    mongo_query[f"organ_stock.{organ_name}"] = {"$gt": 0}
                else:
                    mongo_query[f"inventory.{sub_filter}"] = {"$gt": 0}

        mongo_str = f"db.assets_in.find(\n  {self_format_json(mongo_query, indent=2)}\n)"
        
        filter_sql = ""
        if asset_type:
            filter_sql += f"\n  AND type = '{asset_type}'"
            if asset_type == "donor" and sub_filter:
                filter_sql += f"\n  AND blood_group = '{sub_filter}'"
            elif asset_type == "blood_bank" and sub_filter:
                if sub_filter.startswith("organ:"):
                    organ_name = sub_filter.split(":")[1]
                    filter_sql += f"\n  AND organ_stock->>'{organ_name}'::integer > 0"
                else:
                    filter_sql += f"\n  AND inventory->>'{sub_filter}'::integer > 0"

        postgis_sql = (
            f"SELECT id, name, type,\n"
            f"       ST_DistanceSphere(geom, ST_MakePoint({lng:.5f}, {lat:.5f})) / 1000.0 AS distance_km\n"
            f"FROM care_assets_in\n"
            f"WHERE ST_DWithin(\n"
            f"  geom,\n"
            f"  ST_SetSRID(ST_MakePoint({lng:.5f}, {lat:.5f}), 4326)::geography,\n"
            f"  {radius_meters}\n"
            f"){filter_sql}\n"
            f"ORDER BY distance_km ASC;"
        )
        
        return {
            "mongodb": mongo_str,
            "postgis": postgis_sql
        }

def self_format_json(d, indent=2):
    import json
    return json.dumps(d, indent=indent)

# Export legacy interface using unified client under the hood
db_client = LegacyDonorDBClient()
