#!/usr/bin/env python3
import sys
import json
import cv2
import os
from datetime import datetime
import uuid
from ultralytics import YOLO
import time
import numpy as np

# Ensure we can import detection_config
_script_dir = os.path.dirname(os.path.abspath(__file__))
if _script_dir not in sys.path:
    sys.path.insert(0, _script_dir)

try:
    from detection_config import (
        DETECTION_CONF_THRESHOLD,
        is_smoking_class,
        is_relevant_class,
        MIN_FACE_WIDTH,
        MIN_FACE_HEIGHT,
    )
except ImportError:
    DETECTION_CONF_THRESHOLD = 0.5
    MIN_FACE_WIDTH, MIN_FACE_HEIGHT = 60, 60
    def is_smoking_class(n):
        return n and any(k in n.lower() for k in ("smoker", "smoking", "cigarette", "cigar", "smoke"))
    def is_relevant_class(n):
        return n and (is_smoking_class(n) or any(k in n.lower() for k in ("person", "face", "human")))

# --------------------------
# Arguments
# --------------------------
if len(sys.argv) < 4:
    print(json.dumps({"error": "cameraId, camera URL, and model path required"}))
    sys.exit(1)

camera_id = sys.argv[1]
camera_url = sys.argv[2]
MODEL_PATH = sys.argv[3]

# --------------------------
# Load YOLO model
# --------------------------
os.environ["YOLO_VERBOSE"] = "False"
try:
    model = YOLO(MODEL_PATH)
except Exception as e:
    print(json.dumps({"error": f"Failed to load model: {str(e)}"}), file=sys.stderr)
    sys.exit(1)

# Face detector
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

# Reports directory
REPORT_DIR = "reports"
os.makedirs(REPORT_DIR, exist_ok=True)

def open_camera(url, max_retries=5, wait_sec=2):
    for attempt in range(max_retries):
        try:
            # Handle integer strings for local webcams
            src = int(url) if url.isdigit() else url
            cap = cv2.VideoCapture(src)
            if cap.isOpened():
                # Set lower resolution for performance if needed
                # cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                # cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                return cap
        except Exception:
            pass
        time.sleep(wait_sec)
    return None

cap = open_camera(camera_url)
if not cap:
    print(json.dumps({"error": f"Could not open camera: {camera_url}"}))
    sys.exit(1)

# Track last processing time to limit FPS (e.g., 2 FPS)
last_process_time = 0
PROCESS_INTERVAL = 0.5  # 2 frames per second

while True:
    ret, frame = cap.read()
    if not ret:
        time.sleep(1)
        cap.release()
        cap = open_camera(camera_url)
        if not cap: break
        continue

    current_time = time.time()
    if current_time - last_process_time < PROCESS_INTERVAL:
        continue
    last_process_time = current_time

    # Run YOLO detection
    try:
        results = model(frame, conf=DETECTION_CONF_THRESHOLD, verbose=False)
    except Exception as e:
        print(json.dumps({"error": f"Detection failed: {str(e)}"}), file=sys.stderr)
        continue

    frame_detections = []
    people_boxes = []
    smoking_boxes = []
    
    for r in results:
        for box, conf, cls_id in zip(r.boxes.xyxy.cpu().numpy(),
                                     r.boxes.conf.cpu().numpy(),
                                     r.boxes.cls.cpu().numpy()):
            x1, y1, x2, y2 = map(int, box)
            label = model.names[int(cls_id)]
            confidence = float(conf)

            if not is_relevant_class(label) or confidence < DETECTION_CONF_THRESHOLD:
                continue

            is_smk = is_smoking_class(label)
            is_person = not is_smk
            
            if is_smk:
                smoking_boxes.append({"bbox": [x1, y1, x2, y2], "conf": confidence})
            else:
                people_boxes.append({"bbox": [x1, y1, x2, y2], "conf": confidence})

    # SPATIAL FINE-TUNING: Boost confidence if smoking is near a person
    for smk in smoking_boxes:
        sx1, sy1, sx2, sy2 = smk["bbox"]
        # If smoking is inside or very close to any person bbox, boost its confidence
        for p in people_boxes:
            px1, py1, px2, py2 = p["bbox"]
            # Tolerance for proximity (20% of person box size)
            tol = (px2 - px1) * 0.2
            if not (sx2 < px1 - tol or sx1 > px2 + tol or sy2 < py1 - tol or sy1 > py2 + tol):
                smk["conf"] = min(smk["conf"] * 1.2, 1.0) # 20% boost for situational context
                break

    # Determine final detections for the frame
    final_smoking = [s for s in smoking_boxes if s["conf"] >= DETECTION_CONF_THRESHOLD]
    has_smoking = len(final_smoking) > 0
    
    for smk in final_smoking:
        x1, y1, x2, y2 = smk["bbox"]
        frame_detections.append({
            "label": "smoking", "confidence": smk["conf"], "bbox": [x1, y1, x2, y2]
        })
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
        cv2.putText(frame, f"SMOKING {smk['conf']:.2f} [CONTEXT BOOST]", (x1, y1-5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

    for p in people_boxes:
        x1, y1, x2, y2 = p["bbox"]
        frame_detections.append({
            "label": "person", "confidence": p["conf"], "bbox": [x1, y1, x2, y2]
        })
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 1)

    # If smoking detected, find faces for identification
    face_images = []
    if has_smoking:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        # We look for faces near person detections or anywhere in frame
        faces = face_cascade.detectMultiScale(gray, 1.1, 5)
        for (fx, fy, fw, fh) in faces:
            if fw < MIN_FACE_WIDTH or fh < MIN_FACE_HEIGHT:
                continue
            
            # Save face crop to a temp file for recognition
            face_filename = f"{REPORT_DIR}/face_{uuid.uuid4()}.jpg"
            cv2.imwrite(face_filename, frame[fy:fy+fh, fx:fx+fw])
            
            face_images.append({
                "path": face_filename,
                "bbox": [int(fx), int(fy), int(fx+fw), int(fy+fh)]
            })
            cv2.rectangle(frame, (fx, fy), (fx+fw, fy+fh), (255, 0, 0), 2)

        # Save annotated snapshot as proof
        proof_filename = f"{REPORT_DIR}/{uuid.uuid4()}_proof.jpg"
        cv2.imwrite(proof_filename, frame)
        
        # Output grouped result for the frame
        result = {
            "cameraId": camera_id,
            "timestamp": datetime.utcnow().isoformat(),
            "detections": frame_detections,
            "face_images": face_images,
            "report_image": proof_filename,
            "detected": True
        }
        print(json.dumps(result))
        sys.stdout.flush()

    # Headless-safe show frame
    if os.environ.get("DEBUG_DISPLAY") == "True":
        try:
            cv2.imshow(f"Live - {camera_id}", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'): break
        except Exception: pass

cap.release()
cv2.destroyAllWindows()

