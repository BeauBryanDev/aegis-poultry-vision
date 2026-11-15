
import cv2
import numpy as np


FLOW_WIDTH = 480  # frames are downscaled to this width for the flow
MAX_CORNERS = 200
MIN_CORNERS = 12  # fewer tracked corners than this -> assume no shift

# Camera-motion compensation by Lucas-Kanade optical flow. 
# The camera offset is estimated from the median
# displacement of corners in the background (outside of detected boxes). 
# The offset is subtracted from the positions of all detections,
class CameraMotion:
    def __init__(self) -> None:
        self.previous: np.ndarray | None = None
        self.previous_mask: np.ndarray | None = None
        self.offset = np.zeros(2, dtype=np.float64)

    def update(self, frame: np.ndarray, 
               boxes: np.ndarray
               ) -> np.ndarray:
        """Returns the (x, y) offset to add to this frame's image coordinates.

        `boxes` are this frame's detections (xyxy, image pixels).
        """

        scale = FLOW_WIDTH / frame.shape[1]
        gray = cv2.cvtColor(
            cv2.resize(frame, None, 
                       fx=scale, fy=scale,
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
    def _shift(previous: np.ndarray, 
               mask: np.ndarray, 
               current: np.ndarray
               ) -> np.ndarray:
        """Median displacement of background corners, previous -> current."""

        corners = cv2.goodFeaturesToTrack(
            previous, 
            maxCorners=MAX_CORNERS,
            qualityLevel=0.01,
            minDistance=7, 
            mask=mask,
        ) # Shi-Tomasi Corner Detector

        if corners is None or len(corners) < MIN_CORNERS:
            return np.zeros(2)

        moved, status, _ = cv2.calcOpticalFlowPyrLK(
            previous, 
            current, 
            corners, 
            None,
            winSize=(21, 21),
            maxLevel=3,
        )
        good = status.reshape(-1) == 1

        if good.sum() < MIN_CORNERS:
            return np.zeros(2)

        # it takes the median of the displacements of the good corners, which is robust to outliers
        return np.median((moved - corners).reshape(-1, 2)[good], axis=0)
