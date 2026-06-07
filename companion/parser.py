import re

def parse_dosage_frequency(frequency_text: str) -> dict:
    """
    Parses dosage frequency text and returns a dictionary with:
    - 'times': list of daily times (e.g. ['09:00', '21:00'])
    - 'label': human-readable description of the schedule
    - 'frequency_count': number of times per day
    """
    text = frequency_text.lower().strip()
    
    # Defaults
    times = ["09:00"]
    label = "Once a day (Morning)"
    count = 1
    
    # 1. Detect core frequencies
    
    # Thrice daily / TDS / TID / 3 times a day
    if re.search(r'\b(thrice|three times|tds|tid|3\s*times|3x)\b', text):
        times = ["09:00", "14:00", "21:00"]
        label = "Three times a day"
        count = 3
        
    # Twice daily / BD / BID / 2 times a day / twice a day
    elif re.search(r'\b(twice|two times|bd|bid|2\s*times|2x)\b', text):
        times = ["09:00", "21:00"]
        label = "Twice a day"
        count = 2
        
    # Four times daily / QDS / QID / 4 times a day
    elif re.search(r'\b(four times|qds|qid|4\s*times|4x)\b', text):
        times = ["08:00", "12:00", "16:00", "20:00"]
        label = "Four times a day"
        count = 4
        
    # Every 8 hours
    elif re.search(r'\bevery\s*8\s*hours?\b', text):
        times = ["08:00", "16:00", "00:00"]
        label = "Every 8 hours"
        count = 3
        
    # Every 12 hours
    elif re.search(r'\bevery\s*12\s*hours?\b', text):
        times = ["09:00", "21:00"]
        label = "Every 12 hours"
        count = 2
        
    # Every 6 hours
    elif re.search(r'\bevery\s*6\s*hours?\b', text):
        times = ["06:00", "12:00", "18:00", "00:00"]
        label = "Every 6 hours"
        count = 4
        
    # Bedtime / HS / Nightly / At night
    elif re.search(r'\b(bedtime|nightly|hs|at night|before bed|night)\b', text) and not re.search(r'\b(twice|thrice|bid|tid|bd|tds)\b', text):
        times = ["22:00"]
        label = "Once daily (Bedtime)"
        count = 1
        
    # Once daily / OD / 1 time a day / morning only
    elif re.search(r'\b(once|od|1\s*time|1x|daily)\b', text):
        if re.search(r'\b(evening|night|pm)\b', text):
            times = ["20:00"]
            label = "Once daily (Evening)"
        else:
            times = ["09:00"]
            label = "Once daily (Morning)"
        count = 1
        
    else:
        # Fallback default (Once daily morning)
        times = ["09:00"]
        label = "Once daily (Morning)"
        count = 1
        
    # 2. Modify times based on meal instructions
    
    # "Before food" or "empty stomach" -> shift times 1 hour earlier
    if re.search(r'\b(before food|before meals?|empty stomach|ac)\b', text):
        shifted_times = []
        for t in times:
            hour, minute = map(int, t.split(":"))
            new_hour = (hour - 1) % 24
            shifted_times.append(f"{new_hour:02d}:{minute:02d}")
        times = shifted_times
        label += " (Before Food)"
    
    # "After food" -> adjust to standard after meal times
    elif re.search(r'\b(after food|after meals?|pc)\b', text):
        # We append "(After Food)" to label, times remain standard after-meal times
        label += " (After Food)"
        
    return {
        "times": times,
        "label": label,
        "frequency_count": count
    }
