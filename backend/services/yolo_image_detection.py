#!/usr/bin/env python3
"""
YOLOv8 Image Detection Script
Detects smoking and faces in a single image. Uses detection_config for thresholds.
"""

import sys
import json
import cv2
from ultralytics import YOLO
import os
import uuid
from datetime import datetime

try:
    from detection_config import DETECTION_CONF_THRESHOLD, is_smoking_class, is_relevant_class
except ImportError:
    DETECTION_CONF_THRESHOLD = 0.55
    def is_smoking_class(n):
        return n and any(k in n.lower() for k in ("smoker", "smoking", "cigarette", "cigar", "smoke"))
    def is_relevant_class(n):
        return n and (is_smoking_class(n) or any(k in n.lower() for k in ("person", "face", "human")))

# --------------------------
# Read arguments
# sys.argv[1] = image_path
# sys.argv[2] = model_path
# --------------------------
if len(sys.argv) < 3:
    print(json.dumps({"error": "Image path and model path required"}))
    sys.exit(1)

image_path = sys.argv[1]
model_path = sys.argv[2]

# --------------------------
# Validate paths
# --------------------------
if not os.path.exists(model_path):
    print(json.dumps({"error": f"Model not found: {model_path}"}))
    sys.exit(1)

if not os.path.exists(image_path):
    print(json.dumps({"error": f"Image not found: {image_path}"}))
    sys.exit(1)

# --------------------------
# Load YOLO model
# --------------------------
os.environ["YOLO_VERBOSE"] = "false"
model = YOLO(model_path)

# --------------------------
# Output directory
# --------------------------
REPORTS_DIR = os.path.join(os.getcwd(), "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)


def detect_smoking_image(image_path):
    image = cv2.imread(image_path)
    if image is None:
        return {"error": "Could not read image", "detections": []}

    results = model(image, conf=0.25, verbose=False)
    
    people_boxes = []
    smoking_candidates = []

    for r in results:
        for box, conf, cls_id in zip(r.boxes.xyxy.cpu().numpy(),
                                     r.boxes.conf.cpu().numpy(),
                                     r.boxes.cls.cpu().numpy()):
            x1, y1, x2, y2 = map(int, box)
            class_name = model.names[int(cls_id)]
            confidence = float(conf)

            if not is_relevant_class(class_name):
                continue

            if is_smoking_class(class_name):
                smoking_candidates.append({"label": class_name, "confidence": confidence, "bbox": [x1, y1, x2, y2]})
            else:
                people_boxes.append({"bbox": [x1, y1, x2, y2], "confidence": confidence})

    # SPATIAL CONTEXT BOOSTING
    for smk in smoking_candidates:
        sx1, sy1, sx2, sy2 = smk["bbox"]
        for p in people_boxes:
            px1, py1, px2, py2 = p["bbox"]
            pad_w = (px2 - px1) * 0.25
            pad_h = (py2 - py1) * 0.25
            if not (sx2 < px1 - pad_w or sx1 > px2 + pad_w or sy2 < py1 - pad_h or sy1 > py2 + pad_h):
                smk["confidence"] = min(smk["confidence"] * 1.25, 1.0)
                smk["boosted"] = True
                break

    detections = []
    has_smoking = False
    
    for smk in smoking_candidates:
        if smk["confidence"] < DETECTION_CONF_THRESHOLD:
            continue
            
        has_smoking = True
        detections.append({
            "label": smk["label"],
            "confidence": smk["confidence"],
            "bbox": smk["bbox"],
            "boosted": smk.get("boosted", False)
        })

        x1, y1, x2, y2 = smk["bbox"]
        color = (0, 0, 255)
        cv2.rectangle(image, (x1, y1), (x2, y2), color, 2)
        label = f"{smk['label']} {smk['confidence']:.2f}"
        if smk.get("boosted"): label += " [CONTEXT]"
        cv2.putText(image, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    # Add people to image (optional, lower opacity)
    for p in people_boxes:
        if p["confidence"] >= DETECTION_CONF_THRESHOLD:
            x1, y1, x2, y2 = p["bbox"]
            cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 1)

    # Face detection for identification
    face_images = []
    if has_smoking:
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 5)
        for (x, y, w, h) in faces:
            face_filename = f"face_{uuid.uuid4()}.jpg"
            face_path = os.path.join(REPORTS_DIR, face_filename)
            cv2.imwrite(face_path, image[y:y+h, x:x+w])
            face_images.append({
                "path": face_path,
                "bbox": [int(x), int(y), int(x+w), int(y+h)]
            })

    # Save annotated image
    output_filename = f"{uuid.uuid4()}_result.jpg"
    output_path = os.path.join(REPORTS_DIR, output_filename)
    cv2.imwrite(output_path, image)

    return {
        "detections": detections,
        "face_images": face_images,
        "timestamp": datetime.utcnow().isoformat(),
        "report_image": output_path,
        "detected": has_smoking
    }


if __name__ == "__main__":
    try:
        result = detect_smoking_image(image_path)
        print(json.dumps(result))
        sys.stdout.flush()
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.stdout.flush()
        sys.exit(1)
