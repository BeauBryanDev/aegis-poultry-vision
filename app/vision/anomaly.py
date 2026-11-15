
from collections import deque
from statistics import median

from app.core.config import settings
from app.core.constants import ACTIVE, ANOMALY, RESTING
from app.vision.kinematics import Motion

# Kinematic anomaly rule: a bird that suddenly speeds up
class _TrackState:
    __slots__ = ("speeds", "streak", "hold_until", "last_step")

    def __init__(self, maxlen: int) -> None:
        self.speeds: deque[float] = deque(maxlen=maxlen)
        self.streak = 0
        self.hold_until = -1
        self.last_step = -1


class AnomalyMonitor:
    def __init__(self, fps: float, window: int) -> None:
        self.fps = fps
        # The newest window speeds are left out of the baseline: they
        # already contain the burst we are trying to compare against it.
        self.recent = window
        self.min_streak = window + settings.ANOMALY_MIN_FRAMES
        # A bird must have this much speed history of its own before it can be
        # judged: a bird first seen already walking has no "before" to compare.
        self.min_history = self.recent + max(
            1, round(fps * settings.ANOMALY_MIN_HISTORY_SECONDS)
        )
        self.baseline_frames = max(2, round(fps * settings.ANOMALY_BASELINE_SECONDS))
        self.hold_frames = max(1, round(fps * settings.ANOMALY_HOLD_SECONDS))
        self.forget_after = max(
            self.hold_frames, 
            round(fps * settings.TRACK_LOST_SECONDS)
        ) + 1

        self.tracks: dict[int, _TrackState] = {}
        self.events: deque[dict] = deque(maxlen=settings.MAX_EVENTS)
        self.total_events = 0
        self.active = 0
        self._frame = (1, 1, 0.0, 0.0)


    def update(self, step: int,
               motions: dict[int, Motion],
               width: int, height: int,
               offset: tuple[float, float] = (0.0, 0.0)
               ) -> dict[int, str]:
        """ 
        Returns the activity state of every bird in the frame.

        offset is the camera offset the motions were measured with; it is
        removed again so event positions are in image coordinates.
        """

        self._frame = (width, height, float(offset[0]), float(offset[1]))

        states: dict[int, str] = {}

        for track_id, motion in motions.items():
            track = self.tracks.get(track_id)

            if track is None:
                track = self.tracks[track_id] = _TrackState(
                    self.baseline_frames + self.recent
                )

            track.last_step = step
            states[track_id] = self._update_track(
                track_id, track, step, motion
            )

        self.active = sum(1 for state in states.values() if state == ANOMALY)
        self._forget_old_tracks(step)

        return states


    def _baseline(self, track: _TrackState) -> float:
        past = list(track.speeds)[:-self.recent]
        own = median(past) if past else 0.0

        return max(own, settings.ANOMALY_BASELINE_FLOOR)


    def _update_track(self, 
                      track_id: int, 
                      track: _TrackState, 
                      step: int,
                      motion: Motion
                      ) -> str:
        
        if not motion.ready:
            track.streak = 0
            return ANOMALY if step <= track.hold_until else RESTING

        baseline = self._baseline(track)
        track.speeds.append(motion.speed_bl)
        known = len(track.speeds) >= self.min_history

        fast = motion.speed_bl >= settings.ANOMALY_SPEED_BL
        surge = motion.accel_bl >= settings.ANOMALY_ACCEL_BL
        abrupt = motion.speed_bl >= settings.ANOMALY_BASELINE_RATIO * baseline

        if known and (fast or surge) and abrupt:
            track.streak += 1
        else:
            track.streak = 0

        if track.streak >= self.min_streak:
            if step > track.hold_until:
                self._open_event(
                    track_id, step, motion, baseline,
                    "speed" if fast else "acceleration",
                )
            track.hold_until = step + self.hold_frames

        if step <= track.hold_until:
            return ANOMALY

        return ACTIVE if motion.speed_bl >= settings.ACTIVE_SPEED_BL else RESTING


    def _open_event(self, track_id: int, 
                    step: int, 
                    motion: Motion,
                    baseline: float, 
                    trigger: str
                    ) -> None:
        """ It save the  last MAX_EVENTS events in a deque, and counts them. """
        width, height, offset_x, offset_y = self._frame
        self.total_events += 1
        
        self.events.append({
            "id": self.total_events,
            "track_id": track_id,
            "time_s": round(step / self.fps, 2),
            "trigger": trigger,
            "speed": round(motion.speed_bl, 2),
            "accel": round(motion.accel_bl, 2),
            "baseline": round(baseline, 2),
            "ratio": round(motion.speed_bl / baseline, 1),
            "position": [
                round(min(max((motion.cx - offset_x) / width, 0.0), 1.0), 4),
                round(min(max((motion.cy - offset_y) / height, 0.0), 1.0), 4),
            ],
        })


    def _forget_old_tracks(self, step: int) -> None:
        """ it forgets tracks that have not been seen for a while, to avoid memory leaks. """
        stale = [
            track_id for track_id, track in self.tracks.items()
            if step - track.last_step > self.forget_after
        ]

        for track_id in stale:
            del self.tracks[track_id]


    def state(self) -> dict:
        
        return {
            "active": self.active,
            "detected": self.total_events > 0,
            "total_events": self.total_events,
            "events": list(self.events),
            "thresholds": {
                "speed": settings.ANOMALY_SPEED_BL,
                "accel": settings.ANOMALY_ACCEL_BL,
                "baseline_ratio": settings.ANOMALY_BASELINE_RATIO,
            },
        }
