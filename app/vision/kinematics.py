"""Per-bird kinematics from bounding boxes (classic finite differences).

For every track, with (x, y) the box position in pixels and t in seconds:

    vx = dx / dt        vy = dy / dt
    speed = sqrt(vx^2 + vy^2)
    accel = d(speed) / dt

dx, dy and d(speed) are taken across a short window (KIN_WINDOW_SECONDS)
instead of two consecutive frames: a box jitters by a pixel or two every
frame, and dividing that jitter by one frame's dt would look like motion.

dx is not the centroid displacement but the *rigid translation* of the box:
the left and right edges must both move the same way, and the smaller of the
two displacements is used (same for dy with top and bottom). When a neighbor
occludes a bird its box grows or shrinks on one side; the centroid shifts but
the bird did not move, and this estimate correctly reads zero.

Speed and acceleration are also given in body lengths (BL), where one body
length is sqrt(box width * box height). That makes them independent of how
far the bird is from the camera.
"""

from collections import deque
from dataclasses import dataclass
from math import hypot, sqrt
from statistics import median

import numpy as np

from app.core.config import settings


@dataclass(slots=True)
class Motion:
    cx: float           # centroid, px
    cy: float
    vx: float           # px/s
    vy: float           # px/s
    speed: float        # px/s
    accel: float        # px/s^2
    body: float         # body length, px
    speed_bl: float     # BL/s
    accel_bl: float     # BL/s^2
    ready: bool         # False until the track has a full window of history


def rigid_shift(first_edge: float, second_edge: float) -> float:
    """Displacement shared by two opposite box edges (0 if they disagree)."""

    if first_edge * second_edge <= 0:
        return 0.0

    return first_edge if abs(first_edge) < abs(second_edge) else second_edge


class _History:
    __slots__ = ("points", "speeds", "sizes", "last_step")

    def __init__(self, window: int, size_frames: int) -> None:
        self.points: deque[tuple[int, float, float, float, float]] = deque(
            maxlen=window + 1
        )
        self.speeds: deque[tuple[int, float]] = deque(maxlen=window + 1)
        self.sizes: deque[float] = deque(maxlen=size_frames)
        self.last_step = -1

    def reset(self) -> None:
        self.points.clear()
        self.speeds.clear()


class KinematicEngine:
    """Keeps a short box history per track and differentiates it."""

    def __init__(self, fps: float) -> None:
        self.fps = fps
        self.window = max(2, round(fps * settings.KIN_WINDOW_SECONDS))
        self.max_gap = max(1, round(fps * settings.KIN_MAX_GAP_SECONDS))
        self.size_frames = max(self.window + 1, round(fps))
        self.forget_after = max(
            self.max_gap, round(fps * settings.TRACK_LOST_SECONDS)
        ) + 1
        self.tracks: dict[int, _History] = {}

    def update(self, step: int,
               tracker_ids: np.ndarray,
               xyxy: np.ndarray
               ) -> dict[int, Motion]:
        """`step` is the index of the processed frame (dt = steps / fps)."""

        motions: dict[int, Motion] = {}

        for track_id, box in zip(tracker_ids, xyxy):
            x1, y1, x2, y2 = (float(v) for v in box)
            motions[int(track_id)] = self._update_track(
                int(track_id), step, x1, y1, x2, y2
            )

        self._forget_old_tracks(step)

        return motions

    def _update_track(self, track_id: int, step: int,
                      x1: float, y1: float, x2: float, y2: float) -> Motion:
        history = self.tracks.get(track_id)

        if history is None:
            history = self.tracks[track_id] = _History(self.window, self.size_frames)
        elif step - history.last_step > self.max_gap:
            # The bird was lost for a while: its jump back is not a movement.
            history.reset()

        history.last_step = step
        history.points.append((step, x1, y1, x2, y2))
        history.sizes.append(sqrt(max(x2 - x1, 1.0) * max(y2 - y1, 1.0)))

        body = median(history.sizes)
        vx = vy = speed = accel = 0.0
        ready = len(history.points) == history.points.maxlen

        if ready:
            old_step, old_x1, old_y1, old_x2, old_y2 = history.points[0]
            dt = (step - old_step) / self.fps
            vx = rigid_shift(x1 - old_x1, x2 - old_x2) / dt
            vy = rigid_shift(y1 - old_y1, y2 - old_y2) / dt
            speed = hypot(vx, vy)

            history.speeds.append((step, speed))

            if len(history.speeds) == history.speeds.maxlen:
                first_step, first_speed = history.speeds[0]
                accel = (speed - first_speed) / ((step - first_step) / self.fps)

        return Motion(
            cx=(x1 + x2) / 2, cy=(y1 + y2) / 2, vx=vx, vy=vy,
            speed=speed, accel=accel, body=body,
            speed_bl=speed / body, accel_bl=accel / body,
            ready=ready,
        )

    def _forget_old_tracks(self, step: int) -> None:
        stale = [
            track_id for track_id, history in self.tracks.items()
            if step - history.last_step > self.forget_after
        ]

        for track_id in stale:
            del self.tracks[track_id]
