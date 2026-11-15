
import onnxruntime as ort

from app.core.config import BASE_DIR, settings
from app.core.exceptions import ModelNotLoadedError


_sessions: dict[str, ort.InferenceSession] = {}

# Process-global ONNX Runtime sessio

def _load(relative_path: str) -> ort.InferenceSession:
    model_path = BASE_DIR / relative_path

    if not model_path.exists():
        raise FileNotFoundError(f"ONNX model not found: {model_path}")

    return ort.InferenceSession(
        str(model_path),
        providers=["CPUExecutionProvider"],
    )


def initialize_models() -> None:
    """Load the chicken detector into memory."""

    if _sessions:
        return

    _sessions["yolo"] = _load(settings.YOLO_MODEL_PATH)


def models_loaded() -> bool:
    return "yolo" in _sessions


def get_yolo_session() -> ort.InferenceSession:
    session = _sessions.get("yolo")

    if session is None:
        raise ModelNotLoadedError("Chicken detector has not been initialized.")

    return session


def close_model_sessions() -> None:
    _sessions.clear()
