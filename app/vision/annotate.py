"""OpenCV drawing: boxes, track IDs, velocity arrows, counters, anomaly banner."""

import cv2
import numpy as np

from app.core.constants import ACTIVE, ANOMALY, RESTING


FONT = cv2.FONT_HERSHEY_SIMPLEX

# BGR, one color per activity state. Same colors as the frontend legend
# (ACTIVITY_COLOR in frontend/src/theme.ts) - keep the two in sync.
STATE_COLORS: dict[str, tuple[int, int, int]] = {
    RESTING: (38, 168, 249),    # amber  #f9a826
    ACTIVE: (94, 197, 34),      # green  #22c55e
    ANOMALY: (54, 67, 244),     # red    #f44336
}
CYAN = (191, 212, 45)           # #2dd4bf
RED = (0, 0, 255)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)

ARROW_SECONDS = 0.25    # an arrow shows where the bird would be after this long


def _label(frame: np.ndarray, text: str,
           x: int,
           y: int,
           color, scale: float
           ) -> None:

    thickness = max(1, round(scale * 2))
    (tw, th), baseline = cv2.getTextSize(text, FONT, scale, thickness)
    y = max(y, th + baseline + 2)
    cv2.rectangle(frame, (x, y - th - baseline - 2),
                  (x + tw + 4, y), color, -1)

    cv2.putText(frame, text, (x + 2, y - baseline),
                FONT, scale, BLACK,
                thickness, cv2.LINE_AA)


def draw_tracks(frame: np.ndarray, tracks: list[dict]) -> None:
    """`tracks` are the per-bird dicts built by the pipeline (pixel fields)."""

    scale = max(0.35, frame.shape[0] / 1600)
    thickness = max(1, round(frame.shape[0] / 480))

    # Anomalies last, so their red boxes are never hidden under a neighbor.
    for track in sorted(tracks, key=lambda t: t["state"] == ANOMALY):
        x1, y1, x2, y2 = track["xyxy"]
        state = track["state"]
        color = STATE_COLORS[state]
        anomalous = state == ANOMALY

        cv2.rectangle(frame, (x1, y1), (x2, y2), color,
                      thickness * 2 if anomalous else thickness)

        if state != RESTING:
            cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
            tip = (round(cx + track["vx"] * ARROW_SECONDS),
                   round(cy + track["vy"] * ARROW_SECONDS))
            cv2.arrowedLine(frame, (cx, cy), tip, color, thickness,
                            cv2.LINE_AA, tipLength=0.3)

        text = f"#{track['id']}"
        if anomalous:
            text += f" {track['speed']:.1f} BL/s"

        _label(frame, text, x1, y1, color, scale)


def draw_counters(frame: np.ndarray,
                  live: int,
                  total_unique: int,
                  states: dict[str, int],
                  events: int
                  ) -> None:

    scale = max(0.45, frame.shape[0] / 1200)
    thickness = max(1, round(scale * 2))
    line_h = int(34 * scale) + 6
    lines = [
        (f"BIRDS {live}", WHITE),
        (f"unique {total_unique}", CYAN),
        (f"resting {states[RESTING]}", STATE_COLORS[RESTING]),
        (f"active {states[ACTIVE]}", STATE_COLORS[ACTIVE]),
        (f"anomaly {states[ANOMALY]}", STATE_COLORS[ANOMALY]),
        (f"events {events}", WHITE),
    ]
    width = max(cv2.getTextSize(t, FONT, scale, thickness)[0][0] for t, _ in lines) + 40

    overlay = frame.copy()
    cv2.rectangle(overlay, (8, 8), (8 + width, 16 + line_h * len(lines)), BLACK, -1)
    cv2.addWeighted(overlay, 0.55, frame, 0.45, 0, dst=frame)

    for i, (text, color) in enumerate(lines):
        cv2.putText(frame, text, (18, 8 + line_h * (i + 1) - 6), FONT, scale,
                    color, thickness, cv2.LINE_AA)


def draw_anomaly(frame: np.ndarray, active: int) -> None:
    """Red frame border + banner while at least one bird is flagged."""

    if not active:
        return

    height, width = frame.shape[:2]
    scale = max(0.5, height / 1000)
    thickness = max(1, round(scale * 2))

    text = f"ANOMALY x{active}"
    (tw, th), _ = cv2.getTextSize(text, FONT, scale, thickness)
    x, y = width - tw - 18, th + 18

    cv2.rectangle(frame, (0, 0), (width - 1, height - 1), RED, max(4, height // 120))
    cv2.rectangle(frame, (x - 8, y - th - 8), (x + tw + 8, y + 8), RED, -1)
    cv2.putText(frame, text, (x, y), FONT, scale, WHITE, thickness, cv2.LINE_AA)
