#!/usr/bin/env python3
import sys
import json
import cv2
import numpy as np
import os
import requests
import pickle
import time

try:
    import face_recognition
except ImportError:
    # Just to allow script to be created without error if library is missing
    pass

def download_image(url):
    try:
        res = requests.get(url, timeout=10)
        if res.status_code == 200:
            nparr = np.frombuffer(res.content, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return img
    except:
        return None
    return None

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "student_json and cache_path required"}))
        sys.exit(1)

    students = json.loads(sys.argv[1])
    cache_path = sys.argv[2]
    
    encodings_cache = {}
    
    print(f"Starting batch encoding for {len(students)} students...")
    start_time = time.time()
    
    for student in students:
        s_id = student.get('id')
        url = student.get('photoUrl')
        
        if not s_id or not url:
            continue
            
        img = download_image(url)
        if img is not None:
            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            encodings = face_recognition.face_encodings(rgb)
            if encodings:
                encodings_cache[s_id] = {
                    "encoding": encodings[0],
                    "name": student.get('name'),
                    "studentId": student.get('studentId'),
                    "email": student.get('email')
                }
                print(f"Encoded: {student.get('name')}")
    
    # Save to disk
    with open(cache_path, 'wb') as f:
        pickle.dump(encodings_cache, f)
        
    duration = time.time() - start_time
    print(json.dumps({
        "status": "success",
        "encoded_count": len(encodings_cache),
        "duration_sec": round(duration, 2),
        "cache_path": cache_path
    }))

if __name__ == "__main__":
    main()
