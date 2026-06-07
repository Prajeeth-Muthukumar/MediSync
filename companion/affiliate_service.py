import urllib.parse
import hashlib
from caresync_core.mongodb import db

def get_pharmacy_comparisons(medication_name: str) -> dict:
    """
    Searches and compares prices across online pharmacies (Tata 1mg, Netmeds, PharmEasy).
    Uses a highly realistic procedural generator based on medication name hash for consistency.
    Caches search results in MongoDB to speed up downstream queries.
    """
    cleaned_name = medication_name.strip()
    
    # Check MongoDB cache first to see if we already have prices
    try:
        cached_result = db.pharmacy_cache.find_one({"medication_name": cleaned_name})
        if cached_result:
            # Remove MongoDB internal ID for JSON serializability
            cached_result.pop("_id", None)
            return cached_result
    except Exception as e:
        print(f"Failed to check pharmacy cache in MongoDB: {e}")

    # Generate a procedural consistent base price (between Rs 50 and Rs 500)
    # Using MD5 hash of medication name to ensure consistent prices for the same name!
    name_hash = int(hashlib.md5(cleaned_name.encode('utf-8')).hexdigest(), 16)
    base_price = 50.0 + (name_hash % 450)
    
    # Generate pharmacy-specific pricing and discounts procedurally
    # 1. Tata 1mg (typically has 10-18% discount)
    discount_1mg = 10 + (name_hash % 9)
    price_1mg = round(base_price * (1 - discount_1mg / 100), 2)
    link_1mg = f"https://www.1mg.com/search/all?name={urllib.parse.quote(cleaned_name)}"
    
    # 2. Netmeds (typically has 12-20% discount)
    discount_netmeds = 12 + (name_hash % 9)
    price_netmeds = round(base_price * (1 - discount_netmeds / 100), 2)
    link_netmeds = f"https://www.netmeds.com/catalogsearch/result?q={urllib.parse.quote(cleaned_name)}"
    
    # 3. PharmEasy (typically has 15-22% discount)
    discount_pharmeasy = 15 + (name_hash % 8)
    price_pharmeasy = round(base_price * (1 - discount_pharmeasy / 100), 2)
    link_pharmeasy = f"https://pharmeasy.in/search/all?searchTextField={urllib.parse.quote(cleaned_name)}"
    
    # Deduce active ingredients (procedural mock helper)
    ingredients = "Active Pharmaceutical Ingredient"
    if "metformin" in cleaned_name.lower():
        ingredients = "Metformin Hydrochloride"
    elif "paracetamol" in cleaned_name.lower() or "crocin" in cleaned_name.lower():
        ingredients = "Paracetamol / Acetaminophen"
    elif "amoxicillin" in cleaned_name.lower():
        ingredients = "Amoxicillin Trihydrate"
    elif "atorvastatin" in cleaned_name.lower() or "lipitor" in cleaned_name.lower():
        ingredients = "Atorvastatin Calcium"
    elif "losartan" in cleaned_name.lower():
        ingredients = "Losartan Potassium"
        
    result = {
        "medication_name": cleaned_name,
        "base_price": round(base_price, 2),
        "active_ingredients": ingredients,
        "pharmacies": [
            {
                "name": "Tata 1mg",
                "price": price_1mg,
                "discount": discount_1mg,
                "buy_link": link_1mg,
                "delivery_days": 1 + (name_hash % 2), # 1-2 days
                "rating": round(4.2 + (name_hash % 6) * 0.1, 1),
                "logo": "https://www.1mg.com/favicon.ico"
            },
            {
                "name": "Netmeds",
                "price": price_netmeds,
                "discount": discount_netmeds,
                "buy_link": link_netmeds,
                "delivery_days": 2 + (name_hash % 2), # 2-3 days
                "rating": round(4.0 + (name_hash % 7) * 0.1, 1),
                "logo": "https://www.netmeds.com/assets/global/images/favicon.ico"
            },
            {
                "name": "PharmEasy",
                "price": price_pharmeasy,
                "discount": discount_pharmeasy,
                "buy_link": link_pharmeasy,
                "delivery_days": 1 + (name_hash % 3), # 1-3 days
                "rating": round(4.1 + (name_hash % 6) * 0.1, 1),
                "logo": "https://pharmeasy.in/favicon.ico"
            }
        ]
    }
    
    # Store in cache
    try:
        db.pharmacy_cache.insert_one(result.copy())
    except Exception as e:
        print(f"Failed to cache pharmacy results in MongoDB: {e}")
        
    return result
