#!/usr/bin/env python3
"""
Shared detection config (env + defaults) for best accuracy.
Tune via environment variables for production.
"""
import os

# YOLO confidence: above this to count as detection (Default 0.45)
DETECTION_CONF_THRESHOLD = float(os.environ.get("DETECTION_CONF_THRESHOLD", "0.45"))

# Minimum confidence to auto-generate challan (Default 0.70 for higher reliability)
CHALLAN_CONF_THRESHOLD = float(os.environ.get("CHALLAN_CONF_THRESHOLD", "0.70"))

# Face match: max distance to accept as same person (closer to 0 is stricter)
# 0.50 is the "sweet spot" for preventing false identifications.
FACE_MATCH_THRESHOLD = float(os.environ.get("FACE_MATCH_THRESHOLD", "0.50"))

# Minimum face size (pixels) to send for recognition; smaller faces are often noisy
MIN_FACE_WIDTH = int(os.environ.get("MIN_FACE_WIDTH", "50"))
MIN_FACE_HEIGHT = int(os.environ.get("MIN_FACE_HEIGHT", "50"))

# High-confidence threshold for immediate automatic processing without manual review
CHALLAN_AUTO_CONFIRM_THRESHOLD = float(os.environ.get("CHALLAN_AUTO_CONFIRM_THRESHOLD", "0.85"))

# Cool-down between challans for same entity (minutes)
CHALLAN_COOLDOWN_MINUTES = int(os.environ.get("CHALLAN_COOLDOWN_MINUTES", "5"))

# Class name keywords (model may use different names; add your model's class names if needed)
SMOKING_KEYWORDS = ("smoker", "smoking", "cigarette", "cigar", "smoke", "cig", "smk", "vape", "tobacco")
PERSON_KEYWORDS = ("person", "face", "human")
EXCLUDE_KEYWORDS = ("no-smoking", "sign", "logo", "ash-tray")


def is_smoking_class(name):
    if not name:
        return False
    n = name.lower().strip()
    # Check if any part of the name matches exclusion keywords
    if any(k in n for k in EXCLUDE_KEYWORDS):
        return False
    return any(k in n for k in SMOKING_KEYWORDS)


def is_person_or_face_class(name):
    if not name:
        return False
    n = name.lower().strip()
    return any(k in n for k in PERSON_KEYWORDS)


def is_relevant_class(name):
    return is_smoking_class(name) or is_person_or_face_class(name)
