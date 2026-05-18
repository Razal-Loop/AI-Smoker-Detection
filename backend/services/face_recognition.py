#!/usr/bin/env python3
"""
Face Recognition Service
Matches detected faces with student photos stored in Firebase Storage
"""

import sys
import json
import cv2
import numpy as np
import os
import requests
from datetime import datetime
import face_recognition
import base64
from io import BytesIO

# --------------------------
# Arguments
# sys.argv[1] = detected_face_image_path (local file)
# sys.argv[2] = students_json (JSON string with student data including photoUrl)
# --------------------------
if len(sys.argv) < 3:
    print(json.dumps({"error": "Detected face image path and students JSON required", "matchedStudent": None}))
    sys.exit(1)

detected_face_path = sys.argv[1]
students_json = sys.argv[2]

try:
    students = json.loads(students_json)
except json.JSONDecodeError:
    print(json.dumps({"error": "Invalid students JSON", "matchedStudent": None}))
    sys.exit(1)

# --------------------------
# Load detected face image
# --------------------------
try:
    detected_image = cv2.imread(detected_face_path)
    if detected_image is None:
        print(json.dumps({"error": "Could not read detected face image", "matchedStudent": None}))
        sys.exit(1)
    
    # IMAGE ENHANCEMENT: Fine-tune visibility for better recognition
    # 1. Convert to LAB color space to equalize lightness without affecting color
    lab = cv2.cvtColor(detected_image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    lab = cv2.merge((l, a, b))
    detected_enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    
    # 2. Convert to RGB
    detected_image_rgb = cv2.cvtColor(detected_enhanced, cv2.COLOR_BGR2RGB)
    
    # Get face encodings from detected image
    detected_encodings = face_recognition.face_encodings(detected_image_rgb)
    
    if len(detected_encodings) == 0:
        print(json.dumps({"error": "No face found in detected image", "matchedStudent": None}))
        sys.exit(1)
    
    detected_encoding = detected_encodings[0]
    
except Exception as e:
    print(json.dumps({"error": f"Error processing detected face: {str(e)}", "matchedStudent": None}))
    sys.exit(1)

# --------------------------
# Match with student photos
# --------------------------
try:
    from detection_config import FACE_MATCH_THRESHOLD
except ImportError:
    FACE_MATCH_THRESHOLD = float(os.environ.get("FACE_MATCH_THRESHOLD", "0.50"))

best_match = None
best_distance = float('inf')

# OPTIMIZATION: Try to load from cache first
CACHE_PATH = os.path.join(os.path.dirname(__file__), "student_encodings.pkl")
cached_encodings = {}
if os.path.exists(CACHE_PATH):
    try:
        import pickle
        with open(CACHE_PATH, 'rb') as f:
            cached_encodings = pickle.load(f)
    except Exception:
        pass

if cached_encodings:
    # Fast match using cache
    for s_id, data in cached_encodings.items():
        try:
            distance = face_recognition.face_distance([detected_encoding], data['encoding'])[0]
            if distance < best_distance and distance < FACE_MATCH_THRESHOLD:
                best_distance = distance
                best_match = {
                    "id": s_id,
                    "name": data.get('name'),
                    "email": data.get('email'),
                    "studentId": data.get('studentId'),
                    "confidence": 1.0 - distance,
                    "distance": float(distance)
                }
        except Exception:
            continue
else:
    # Slow fallback: original logic
    for student in students:
        if not student.get('photoUrl'): continue
        try:
            response = requests.get(student['photoUrl'], timeout=10)
            if response.status_code != 200: continue
            nparr = np.frombuffer(response.content, np.uint8)
            student_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if student_image is None: continue
            student_image_rgb = cv2.cvtColor(student_image, cv2.COLOR_BGR2RGB)
            student_encodings = face_recognition.face_encodings(student_image_rgb)
            if len(student_encodings) == 0: continue
            student_encoding = student_encodings[0]
            distance = face_recognition.face_distance([detected_encoding], student_encoding)[0]
            if distance < best_distance and distance < FACE_MATCH_THRESHOLD:
                best_distance = distance
                best_match = {
                    "id": student.get('id'),
                    "name": student.get('name'),
                    "email": student.get('email'),
                    "studentId": student.get('studentId'),
                    "confidence": 1.0 - distance,
                    "distance": float(distance)
                }
        except Exception: continue

# --------------------------
# Output result
# --------------------------
if best_match:
    print(json.dumps({
        "matchedStudent": best_match,
        "timestamp": datetime.utcnow().isoformat()
    }))
else:
    print(json.dumps({
        "matchedStudent": None,
        "message": "No matching student found",
        "timestamp": datetime.utcnow().isoformat()
    }))

sys.stdout.flush()





