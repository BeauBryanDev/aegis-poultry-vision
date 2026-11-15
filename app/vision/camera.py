"""Camera-motion compensation (sparse Lucas-Kanade optical flow).

When the camera pans, every box slides across the image even if no bird
moves. That breaks two things: ByteTrack cannot match boxes that jumped, and
every bird appears to have the camera's velocity.

Each frame we follow background corners from the previous frame to this one
(corners inside bird boxes are ignored) and take the median displacement as
the camera shift. Its running sum is an offset that maps image pixels to
stabilized "world" pixels:

    world = image + offset

Tracking and kinematics run in world coordinates; drawing subtracts the
offset again. Translation only: zoom and rotation are not compensated.
With a fixed camera the shift is ~0 and this is a no-op.
"""

import cv2
import numpy as np


FLOW_WIDTH = 480        # frames are downscaled to this width for the flow
MAX_CORNERS = 200
MIN_CORNERS = 12        # fewer tracked corners than this -> assume no shift


class CameraMotion:
    def __init__(self) -> None:
        self.previous: np.ndarray | None = None
        self.previous_mask: np.ndarray | None = None
        self.offset = np.zeros(2, dtype=np.float64)

    def update(self, frame: np.ndarray, boxes: np.ndarray) -> np.ndarray:
        """Returns the (x, y) offset to add to this frame's image coordinates.

        `boxes` are this frame's detections (xyxy, image pixels).
        """

        scale = FLOW_WIDTH / frame.shape[1]
        gray = cv2.cvtColor(
            cv2.resize(frame, None, fx=scale, fy=scale,
                       interpolation=cv2.INTER_AREA),
            cv2.COLOR_BGR2GRAY,
        )

        # Background mask: 255 everywhere except inside (slightly grown) boxes.
        mask = np.full(gray.shape, 255, dtype=np.uint8)
        for x1, y1, x2, y2 in boxes * scale:
            cv2.rectangle(mask, (int(x1) - 2, int(y1) - 2),
                          (int(x2) + 2, int(y2) + 2), 0, -1)

        if self.previous is not None:
            self.offset -= self._shift(self.previous, self.previous_mask, gray) / scale

        self.previous = gray
        self.previous_mask = mask

        return self.offset.copy()

    @staticmethod
    def _shift(previous: np.ndarray, mask: np.ndarray, current: np.ndarray) -> np.ndarray:
        """Median displacement of background corners, previous -> current."""

        corners = cv2.goodFeaturesToTrack(
            previous, maxCorners=MAX_CORNERS, qualityLevel=0.01,
            minDistance=7, mask=mask,
        )

        if corners is None or len(corners) < MIN_CORNERS:
            return np.zeros(2)

        moved, status, _ = cv2.calcOpticalFlowPyrLK(
            previous, current, corners, None,
            winSize=(21, 21), maxLevel=3,
        )
        good = status.reshape(-1) == 1

        if good.sum() < MIN_CORNERS:
            return np.zeros(2)

        return np.median((moved - corners).reshape(-1, 2)[good], axis=0)
