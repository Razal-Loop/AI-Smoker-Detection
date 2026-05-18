#!/usr/bin/env python3
"""
YOLOv8 Frame Detection Script (Production-ready)
Processes a single frame from stdin (JPEG buffer) and returns JSON detection results.
Uses detection_config for thresholds and robust class matching.
"""
import sys
import os

# Ensure we can import detection_config when run from backend/ (cwd != script dir)
_script_dir = os.path.dirname(os.path.abspath(__file__))
if _script_dir not in sys.path:
    sys.path.insert(0, _script_dir)

import json
import cv2
import numpy as np
from ultralytics import YOLO
import os
import base64
from io import BytesIO

try:
    from detection_config import (
        DETECTION_CONF_THRESHOLD,
        is_smoking_class,
        is_relevant_class,
        MIN_FACE_WIDTH,
        MIN_FACE_HEIGHT,
    )
except ImportError:
    DETECTION_CONF_THRESHOLD = 0.4
    MIN_FACE_WIDTH, MIN_FACE_HEIGHT = 60, 60
    def is_smoking_class(n):
        return n and any(k in n.lower() for k in (
            "smoker", "smoking", "cigarette", "cigar", "smoke", "cig", "smk", "vape", "tobacco"
        ))
    def is_relevant_class(n):
        return (n and (is_smoking_class(n) or any(k in n.lower() for k in ("person", "face", "human"))))

# --------------------------
# Read arguments
# sys.argv[1] = model_path
# --------------------------
if len(sys.argv) < 2:
    print(json.dumps({"error": "Model path required", "detections": []}))
    sys.exit(1)

MODEL_PATH = sys.argv[1]

# --------------------------
# Validate model path
# --------------------------
if not os.path.exists(MODEL_PATH):
    print(json.dumps({"error": f"Model not found: {MODEL_PATH}", "detections": []}))
    sys.exit(1)

# --------------------------
# Load YOLO model
# --------------------------
try:
    model = YOLO(MODEL_PATH)
except Exception as e:
    print(json.dumps({"error": f"Failed to load model: {str(e)}", "detections": []}))
    sys.exit(1)

# --------------------------
# Read frame from stdin
# --------------------------
try:
    # Read binary data from stdin
    frame_data = sys.stdin.buffer.read()
    
    if not frame_data:
        print(json.dumps({"error": "No frame data received", "detections": []}))
        sys.exit(1)

    # Decode JPEG image
    nparr = np.frombuffer(frame_data, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if frame is None:
        print(json.dumps({"error": "Failed to decode image", "detections": []}))
        sys.exit(1)

except Exception as e:
    print(json.dumps({"error": f"Failed to read frame: {str(e)}", "detections": []}))
    sys.exit(1)

# --------------------------
# Run YOLO detection
# --------------------------
detections = []
annotated_frame = frame.copy()
face_images = []  # Store extracted faces for recognition

# Run YOLO with a low confidence so we get more candidates; we filter by threshold below
try:
    results = model(frame, conf=0.25, verbose=False)

    # Face detector for extracting faces when smoking detected
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

    for r in results:
        for box, conf, cls_id in zip(r.boxes.xyxy.cpu().numpy(),
                                     r.boxes.conf.cpu().numpy(),
                                     r.boxes.cls.cpu().numpy()):
            x1, y1, x2, y2 = map(int, box)
            class_name = model.names[int(cls_id)]
            confidence = float(conf)

            if not is_relevant_class(class_name) or confidence < DETECTION_CONF_THRESHOLD:
                continue

            is_smoking = is_smoking_class(class_name)

            detections.append({
                "label": class_name,
                "confidence": confidence,
                "bbox": [x1, y1, x2, y2],
                "detected": True
            })

            color = (0, 0, 255) if is_smoking else (0, 255, 0)
            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(annotated_frame, f"{class_name} {confidence:.2f}",
                       (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

            if is_smoking:
                try:
                    person_region = frame[y1:y2, x1:x2]
                    if person_region.size > 0:
                        gray_region = cv2.cvtColor(person_region, cv2.COLOR_BGR2GRAY)
                        faces = face_cascade.detectMultiScale(gray_region, 1.1, 5)

                        for (fx, fy, fw, fh) in faces:
                            if fw < MIN_FACE_WIDTH or fh < MIN_FACE_HEIGHT:
                                continue
                            face_x = x1 + fx
                            face_y = y1 + fy
                            pad = int(0.1 * min(fw, fh))
                            face_x1 = max(0, face_x - pad)
                            face_y1 = max(0, face_y - pad)
                            face_x2 = min(frame.shape[1], face_x + fw + pad)
                            face_y2 = min(frame.shape[0], face_y + fh + pad)
                            face_img = frame[face_y1:face_y2, face_x1:face_x2]
                            if face_img.size == 0:
                                continue
                            _, face_buffer = cv2.imencode('.jpg', face_img)
                            face_base64 = base64.b64encode(face_buffer).decode('utf-8')
                            face_images.append({
                                "image": face_base64,
                                "bbox": [face_x1, face_y1, face_x2, face_y2]
                            })
                            cv2.rectangle(annotated_frame, (face_x1, face_y1),
                                          (face_x2, face_y2), (255, 0, 0), 2)
                except Exception:
                    pass

except Exception as e:
    print(json.dumps({"error": f"Detection failed: {str(e)}", "detections": []}), file=sys.stderr)
    sys.exit(1)

# --------------------------
# Encode annotated frame as base64 only when smoking is detected (high quality for clear proof)
# --------------------------
snapshot = None
has_smoking = any(is_smoking_class(d.get("label")) for d in detections)
if detections and has_smoking:
    try:
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, 95]
        _, buffer = cv2.imencode('.jpg', annotated_frame, encode_params)
        snapshot = base64.b64encode(buffer).decode('utf-8')
    except Exception as e:
        print(f"Warning: Failed to encode snapshot: {str(e)}", file=sys.stderr)

# --------------------------
# Output JSON result (ensure all values are JSON-serializable; numpy types are not)
# --------------------------
def to_native(obj):
    if hasattr(obj, 'item'):  # numpy scalar
        return obj.item()
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, dict):
        return {k: to_native(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [to_native(v) for v in obj]
    return obj

h, w = frame.shape[:2]
result = {
    "detections": to_native(detections),
    "timestamp": str(cv2.getTickCount()),
    "snapshot": snapshot,
    "faceImages": to_native(face_images),
    "imageWidth": int(w),
    "imageHeight": int(h),
    "modelClasses": list(model.names.values()) if hasattr(model, 'names') and model.names else [],
}

print(json.dumps(result))
sys.stdout.flush()

