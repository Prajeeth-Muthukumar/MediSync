import os
import math
import logging
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

logger = logging.getLogger(__name__)

class UnifiedMongoDBClient:
    def __init__(self, uri="mongodb://localhost:27017/", timeout_ms=1500, db_name="caresync_integrated_db"):
        self.uri = uri
        self.db_name = db_name
        self.client = None
        self.db = None
        self.connected = False
        
        try:
            self.client = MongoClient(uri, serverSelectionTimeoutMS=timeout_ms)
            self.client.admin.command('ping')
            self.db = self.client[self.db_name]
            self.connected = True
            logger.info(f"Successfully connected to MongoDB: {self.db_name}")
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.warning(f"MongoDB not running or unreachable ({e}). Some features may fail.")
            self.connected = False

    def get_collection(self, collection_name):
        if self.connected:
            return self.db[collection_name]
        return None

# Singleton instance
db_client = UnifiedMongoDBClient()
db = db_client.db

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculates distance in kilometers between two points on Earth."""
    R = 6371.0 # Earth's radius in km
    
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    
    a = math.sin(d_lat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c
