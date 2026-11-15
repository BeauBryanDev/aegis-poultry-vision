
import supervision as sv

from app.core.config import settings

# ByteTrack wrapper by supervision
class ChickenTracker:
    def __init__(self, fps: float) -> None:
        frame_rate = max(1, round(fps))

        # Use Kalman filter to smooth the tracks and predict their next position. 
        # This is important for low-fps footage, where birds can move far between frames.
        self.tracker = sv.ByteTrack(
            track_activation_threshold=settings.TRACK_ACTIVATION_CONF,
            lost_track_buffer=max(1, round(settings.TRACK_LOST_SECONDS * frame_rate)),
            minimum_matching_threshold=settings.TRACK_MATCH_THRESHOLD,
            frame_rate=frame_rate,
            minimum_consecutive_frames=2,
        )

    def update(self, detections: sv.Detections) -> sv.Detections:
        """Returns only confirmed tracks, with tracker_id set."""

        if len(detections) == 0:
            detections = sv.Detections.empty()

        return self.tracker.update_with_detections(detections)
