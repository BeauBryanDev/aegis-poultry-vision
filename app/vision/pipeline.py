"""Per-video pipeline: detect -> stabilize -> track -> count -> kinematics -> anomaly -> annotate."""

import time
from collections.abc import Iterator
from pathlib import Path

import cv2
import numpy as np

from app.core.config import settings
from app.core.constants import STATES
from app.core.exceptions import VideoValidationError
from app.core.model_session import get_yolo_session
from app.vision import annotate
from app.vision.anomaly import AnomalyMonitor
from app.vision.camera import CameraMotion
from app.vision.counter import ChickenCounter
from app.vision.detector import ChickenDetector
from app.vision.kinematics import KinematicEngine
from app.vision.tracker import ChickenTracker


class VideoPipeline:
    """Holds all per-video state (tracker, counter, kinematics, anomalies).

    One instance per video; the ONNX session is shared across instances.
    `fps` is the rate of the frames actually processed (source fps / stride).
    """

    def __init__(self, fps: float) -> None:
        self.detector = ChickenDetector(
            get_yolo_session(), settings.DET_CONF, settings.NMS_IOU
        )
        self.camera = CameraMotion() if settings.CAMERA_COMPENSATION else None
        self.tracker = ChickenTracker(fps)
        self.counter = ChickenCounter(settings.MIN_TRACK_FRAMES)
        self.kinematics = KinematicEngine(fps)
        self.anomaly = AnomalyMonitor(fps, self.kinematics.window)
        self.step = 0
        self.states = dict.fromkeys(STATES, 0)
        self.tracks: list[dict] = []

    def process(self, frame: np.ndarray) -> np.ndarray:
        """Runs the pipeline on one BGR frame and returns it annotated."""

        height, width = frame.shape[:2]

        detections = self.detector.detect(frame)

        # Image -> stabilized coordinates, so a camera pan is not bird motion.
        offset = np.zeros(2, dtype=np.float32)
        if self.camera is not None:
            offset = self.camera.update(frame, detections.xyxy).astype(np.float32)
            if len(detections):
                detections.xyxy = detections.xyxy + np.tile(offset, 2)

        tracks = self.tracker.update(detections)
        tracker_ids = tracks.tracker_id if len(tracks) else np.empty(0, dtype=int)
        image_boxes = tracks.xyxy - np.tile(offset, 2)

        self.counter.update(tracker_ids)
        motions = self.kinematics.update(self.step, tracker_ids, tracks.xyxy)
        states = self.anomaly.update(self.step, motions, width, height, offset)

        self.states = dict.fromkeys(STATES, 0)
        self.tracks = []
        drawable: list[dict] = []

        for box, track_id, confidence in zip(
            image_boxes, tracker_ids, tracks.confidence
        ):
            track_id = int(track_id)
            motion = motions[track_id]
            state = states[track_id]
            self.states[state] += 1

            self.tracks.append({
                "id": track_id,
                "confidence": round(float(confidence), 3),
                "state": state,
                "box": [
                    round(min(max(float(box[0]) / width, 0.0), 1.0), 4),
                    round(min(max(float(box[1]) / height, 0.0), 1.0), 4),
                    round(min(max(float(box[2]) / width, 0.0), 1.0), 4),
                    round(min(max(float(box[3]) / height, 0.0), 1.0), 4),
                ],
                "vx": round(motion.vx, 1),
                "vy": round(motion.vy, 1),
                "speed": round(motion.speed_bl, 2),
                "accel": round(motion.accel_bl, 2),
            })
            drawable.append({
                "id": track_id,
                "state": state,
                "xyxy": [int(v) for v in box],
                "vx": motion.vx,
                "vy": motion.vy,
                "speed": motion.speed_bl,
            })

        annotate.draw_tracks(frame, drawable)
        annotate.draw_counters(
            frame, self.counter.live, self.counter.total_unique(),
            self.states, self.anomaly.total_events,
        )
        annotate.draw_anomaly(frame, self.anomaly.active)

        self.step += 1

        return frame

    def stats(self) -> dict:
        return {
            "live_count": self.counter.live,
            "peak_count": self.counter.peak,
            "total_unique": self.counter.total_unique(),
            "states": self.states,
            "tracks": self.tracks,
            "anomaly": self.anomaly.state(),
        }


def probe_video(path: Path) -> dict:
    """Reads fps / size / frame count. Raises if OpenCV cannot decode the file."""

    capture = cv2.VideoCapture(str(path))

    try:
        ok, _ = capture.read() if capture.isOpened() else (False, None)
        if not ok:
            raise VideoValidationError("File is not a readable video.")

        fps = capture.get(cv2.CAP_PROP_FPS)

        return {
            "fps": round(fps, 2) if 1 <= fps <= 240 else 30.0,
            "frame_count": max(0, int(capture.get(cv2.CAP_PROP_FRAME_COUNT))),
            "width": int(capture.get(cv2.CAP_PROP_FRAME_WIDTH)),
            "height": int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT)),
        }
    finally:
        capture.release()


def process_video(path: Path, fps: float) -> Iterator[tuple[np.ndarray, dict]]:
    """Yields (annotated frame, stats) for every processed frame of a video."""

    stride = max(1, settings.FRAME_STRIDE)
    pipeline = VideoPipeline(fps / stride)
    capture = cv2.VideoCapture(str(path))
    started = time.perf_counter()
    index = processed = 0

    try:
        while True:
            ok, frame = capture.read()
            if not ok:
                break

            index += 1
            if (index - 1) % stride:
                continue

            annotated = pipeline.process(frame)
            processed += 1

            stats = pipeline.stats()
            stats["frame_index"] = index
            stats["processing_fps"] = round(
                processed / (time.perf_counter() - started), 1
            )

            yield annotated, stats
    finally:
        capture.release()
