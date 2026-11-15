
from typing import Final

# Chicken detector (YOLO11s, single class)
YOLO_SIZE: Final[int] = 640
LETTERBOX_PAD: Final[int] = 114
CLASS_NAME: Final[str] = "chicken"

# Per-bird activity states reported by the pipeline
RESTING: Final[str] = "resting"
ACTIVE: Final[str] = "active"
ANOMALY: Final[str] = "anomaly"
STATES: Final[tuple[str, ...]] = (RESTING, ACTIVE, ANOMALY)
