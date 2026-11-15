"""Frame preprocessing for the chicken detector."""

import cv2
import numpy as np

from app.core.constants import LETTERBOX_PAD, YOLO_SIZE


def letterbox_640(frame: np.ndarray) -> tuple[np.ndarray, float, tuple[int, int]]:
    """BGR frame -> (1, 3, 640, 640) float32 blob, plus scale and (pad_x, pad_y).

    Letterbox keeps the aspect ratio and pads with gray; RGB, /255, no
    mean/std normalization (that is how the model was trained).
    """

    height, width = frame.shape[:2]
    scale = min(YOLO_SIZE / height, YOLO_SIZE / width)
    new_w, new_h = round(width * scale), round(height * scale)
    pad_x, pad_y = (YOLO_SIZE - new_w) // 2, (YOLO_SIZE - new_h) // 2

    canvas = np.full((YOLO_SIZE, YOLO_SIZE, 3), LETTERBOX_PAD, dtype=np.uint8)
    canvas[pad_y:pad_y + new_h, pad_x:pad_x + new_w] = cv2.resize(
        frame, (new_w, new_h), interpolation=cv2.INTER_LINEAR
    )

    blob = cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB).transpose(2, 0, 1)
    blob = np.ascontiguousarray(blob, dtype=np.float32)[None] / 255.0

    return blob, scale, (pad_x, pad_y)
