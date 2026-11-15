
import numpy as np
import onnxruntime as ort
import supervision as sv

from app.core.exceptions import InferenceError
from app.vision.preprocess import letterbox_640

# YOLO11s chicken detector: ONNX inference, decode and NMS.

def box_iou(box: np.ndarray, boxes: np.ndarray) -> np.ndarray:
    """IoU between one xyxy box and an (N, 4) array of xyxy boxes."""

    x1 = np.maximum(box[0], boxes[:, 0])
    y1 = np.maximum(box[1], boxes[:, 1])
    x2 = np.minimum(box[2], boxes[:, 2])
    y2 = np.minimum(box[3], boxes[:, 3])

    inter = np.clip(x2 - x1, 0, None) * np.clip(y2 - y1, 0, None)
    area = (box[2] - box[0]) * (box[3] - box[1])
    areas = (boxes[:, 2] - boxes[:, 0]) * (boxes[:, 3] - boxes[:, 1])

    return inter / (area + areas - inter + 1e-9)


def nms(boxes: np.ndarray,
        scores: np.ndarray,
        iou_threshold: float
        ) -> np.ndarray:
    """Greedy NMS. Returns the indices of the boxes to keep."""

    order = scores.argsort()[::-1]
    keep: list[int] = []

    while order.size:  #  len(order) > 0:
        best = order[0]
        keep.append(int(best))
        rest = order[1:]
        order = rest[box_iou(boxes[best], boxes[rest]) < iou_threshold]

    return np.array(keep, dtype=np.int64)


class ChickenDetector:
    def __init__(self, session: ort.InferenceSession,
                 conf: float, iou: float) -> None:
        self.session = session
        self.input_name = session.get_inputs()[0].name
        self.conf = conf
        self.iou = iou

    def detect(self, frame: np.ndarray) -> sv.Detections:
        """BGR frame -> detections in original-frame pixel coordinates."""

        height, width = frame.shape[:2]
        blob, scale, (pad_x, pad_y) = letterbox_640(frame)

        try:
            output = self.session.run(None, {self.input_name: blob})[0]
        except Exception as exc:
            raise InferenceError(f"Chicken detector failed: {exc}") from exc

        # (1, 4 + n_classes, 8400) -> (8400, 4 + n_classes); n_classes is 1
        predictions = output[0].T
        confidence = predictions[:, 4:].max(axis=1)

        mask = confidence >= self.conf
        if not mask.any():  # this YOLO CNN is single-class, so no need to return class_id
            return sv.Detections.empty()

        cx, cy, w, h = predictions[mask, :4].T
        confidence = confidence[mask]

        # cxcywh in letterbox space -> xyxy in the original frame
        xyxy = np.stack([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], axis=1)
        # np stack converts (N, 4) -> (4, N), so we transpose back to (N, 4)
        xyxy[:, [0, 2]] = (xyxy[:, [0, 2]] - pad_x) / scale
        xyxy[:, [1, 3]] = (xyxy[:, [1, 3]] - pad_y) / scale
        xyxy[:, [0, 2]] = xyxy[:, [0, 2]].clip(0, width)
        xyxy[:, [1, 3]] = xyxy[:, [1, 3]].clip(0, height)

        keep = nms(xyxy, confidence, self.iou)

        return sv.Detections(
            xyxy=xyxy[keep].astype(np.float32), # pixel coordinates in the original frame
            confidence=confidence[keep].astype(np.float32), # confidence scores
            class_id=np.zeros(len(keep), dtype=int), # class IDs (all zeros for single-class detector)
        )
