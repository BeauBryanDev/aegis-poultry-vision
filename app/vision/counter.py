
import numpy as np

# Bird counting: how many are in frame now, and how many unique tracks.
class ChickenCounter:
    """live is the number of tracked birds in the current frame.

    total_unique counts each track ID once, and only after it has lived
    min_frames frames (filters ghost tracks). In a crowded barn ByteTrack
    gives a bird a new ID after a long occlusion, so total_unique can run
    above the real flock size; live and peak are the reliable numbers.
    """

    def __init__(self, min_frames: int) -> None:
        self.min_frames = min_frames
        self.frames_seen: dict[int, int] = {}
        self.live = 0
        self.peak = 0

    def update(self, tracker_ids: np.ndarray) -> None:
        # Count how many frames each track ID has been seen. Only count a track
        # toward total_unique after it has lived min_frames frames.
        for track_id in tracker_ids:
            key = int(track_id)
            self.frames_seen[key] = self.frames_seen.get(key, 0) + 1

        self.live = len(tracker_ids)
        self.peak = max(self.peak, self.live)

    def total_unique(self) -> int:
        return sum(1 for n in self.frames_seen.values() if n >= self.min_frames)
