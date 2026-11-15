from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Application settings loaded from environment (or `.env` at project root)."""

    # Application
    APP_NAME: str = "PoultryVision AI"
    DEBUG: bool = True
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    API_PREFIX: str = "/api/v1"

    # Model (path relative to the project root)
    YOLO_MODEL_PATH: str = "model/chickens_model.onnx"

    # Detection + NMS
    DET_CONF: float = 0.10          # low on purpose: ByteTrack uses weak boxes too
    NMS_IOU: float = 0.50

    # ByteTrack
    TRACK_ACTIVATION_CONF: float = 0.30
    TRACK_LOST_SECONDS: float = 2.0     # birds get occluded by each other often
    TRACK_MATCH_THRESHOLD: float = 0.90    # loose: low-fps footage moves boxes far
    MIN_TRACK_FRAMES: int = 5       # frames a track must live before it is counted

    # Camera-motion compensation (optical flow on the background). Keep it on
    # for handheld / panning footage; harmless with a fixed camera.
    CAMERA_COMPENSATION: bool = True

    # Kinematics (finite differences over a short window)
    KIN_WINDOW_SECONDS: float = 0.15    # dx, dy are measured across this window
    KIN_MAX_GAP_SECONDS: float = 0.30   # longer gap in a track -> restart its history

    # Anomaly rule. Speeds are in body lengths per second (BL/s), so a bird
    # close to the camera and one far away are judged the same way.
    ANOMALY_SPEED_BL: float = 0.45      # BL/s
    ANOMALY_ACCEL_BL: float = 5.0       # BL/s^2 (speeding up only)
    ANOMALY_BASELINE_RATIO: float = 3.0     # speed must be >= ratio * own baseline
    ANOMALY_BASELINE_SECONDS: float = 2.0   # how far back the baseline looks
    ANOMALY_BASELINE_FLOOR: float = 0.15    # BL/s, baseline of a bird standing still
    ANOMALY_MIN_HISTORY_SECONDS: float = 0.5    # history a bird needs before it is judged
    ANOMALY_MIN_FRAMES: int = 3         # burst frames needed beyond one KIN window
    ANOMALY_HOLD_SECONDS: float = 1.0   # a flagged bird stays flagged this long
    ACTIVE_SPEED_BL: float = 0.25       # below this the bird is "resting"
    MAX_EVENTS: int = 500               # events kept per video

    # Video
    FRAME_STRIDE: int = 1           # process every Nth frame
    JPEG_QUALITY: int = 80
    MAX_UPLOAD_MB: int = 250
    UPLOAD_DIR: Path = BASE_DIR / "uploads"

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_DIR: Path = BASE_DIR / "logs"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
