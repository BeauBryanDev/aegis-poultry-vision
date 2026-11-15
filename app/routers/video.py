
import threading
import uuid
from collections import OrderedDict
from collections.abc import AsyncIterator, Iterator
from pathlib import Path

import cv2
from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.concurrency import iterate_in_threadpool
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.core.constants import STATES
from app.core.exceptions import VideoValidationError
from app.core.logging import logger
from app.vision.pipeline import probe_video, process_video


router = APIRouter(tags=["video"])

ALLOWED_SUFFIXES = {".mp4", ".avi", ".mov", ".mkv", ".webm"}
CHUNK_BYTES = 1024 * 1024
MAX_JOBS = 20
BOUNDARY = "frame"

_jobs: OrderedDict[str, dict] = OrderedDict()
_lock = threading.Lock()


def _empty_stats() -> dict:
    return {
        "frame_index": 0,
        "processing_fps": 0.0,
        "live_count": 0,
        "peak_count": 0,
        "total_unique": 0,
        "states": dict.fromkeys(STATES, 0),
        "tracks": [],
        "anomaly": {
            "active": 0,
            "detected": False,
            "total_events": 0,
            "events": [],
            "thresholds": {
                "speed": settings.ANOMALY_SPEED_BL,
                "accel": settings.ANOMALY_ACCEL_BL,
                "baseline_ratio": settings.ANOMALY_BASELINE_RATIO,
            },
        },
    }


def _get_job(video_id: str) -> dict:
    job = _jobs.get(video_id)

    if job is None:
        raise HTTPException(status_code=404, detail="Unknown video_id.")

    return job


def _public(job: dict) -> dict:
    frame_count = job["frame_count"]
    stats = job["stats"]

    return {
        "video_id": job["video_id"],
        "status": job["status"],
        "error": job["error"],
        "fps": job["fps"],
        "frame_count": frame_count,
        "width": job["width"],
        "height": job["height"],
        "progress": round(min(1.0, stats["frame_index"] / frame_count), 4)
        if frame_count else 0.0,
        **stats,
    }


# POST /upload    -> {video_id, ...}
@router.post("/upload")
async def upload_video(file: UploadFile) -> dict:
    suffix = Path(file.filename or "").suffix.lower()

    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type. Allowed: {sorted(ALLOWED_SUFFIXES)}",
        )

    # The client filename is never used on disk.
    video_id = uuid.uuid4().hex
    path = settings.UPLOAD_DIR / f"{video_id}{suffix}"
    limit = settings.MAX_UPLOAD_MB * 1024 * 1024
    size = 0

    try:
        with path.open("wb") as out:
            while chunk := await file.read(CHUNK_BYTES):
                size += len(chunk)
                if size > limit:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds {settings.MAX_UPLOAD_MB} MB.",
                    )
                out.write(chunk)

        meta = probe_video(path)
    except VideoValidationError as exc:
        path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except BaseException:
        path.unlink(missing_ok=True)
        raise

    job = {
        "video_id": video_id,
        "path": path,
        "status": "pending",
        "error": None,
        "stats": _empty_stats(),
        **meta,
    }

    with _lock:
        _jobs[video_id] = job
        while len(_jobs) > MAX_JOBS:
            _, old = _jobs.popitem(last=False)
            old["path"].unlink(missing_ok=True)

    logger.info("Uploaded video %s (%d bytes, %s)", video_id, size, meta)

    return {
        **_public(job),
        "stream_url": f"{settings.API_PREFIX}/videos/{video_id}/stream",
        "stats_url": f"{settings.API_PREFIX}/videos/{video_id}/stats",
    }


def _mjpeg(job: dict) -> Iterator[bytes]:
    encode_params = [cv2.IMWRITE_JPEG_QUALITY, settings.JPEG_QUALITY]

    try:
        for frame, stats in process_video(job["path"], job["fps"]):
            job["stats"] = stats
            ok, jpeg = cv2.imencode(".jpg", frame, encode_params)
            if not ok:
                continue

            yield (
                f"--{BOUNDARY}\r\n"
                "Content-Type: image/jpeg\r\n"
                f"Content-Length: {len(jpeg)}\r\n\r\n"
            ).encode() + jpeg.tobytes() + b"\r\n"

        job["status"] = "done"
    except GeneratorExit:
        job["status"] = "cancelled"
        raise
    except Exception as exc:
        job["status"] = "error"
        job["error"] = str(exc)
        logger.exception("Processing failed for video %s", job["video_id"])
    finally:
        job["path"].unlink(missing_ok=True)
        logger.info("Video %s finished: %s", 
                    job["video_id"], job["status"])


async def _stream(job: dict) -> AsyncIterator[bytes]:
    """Runs _mjpeg in the threadpool and always closes it.

    When the client disconnects, Starlette just stops iterating. A plain sync
    generator would be left suspended: the job would stay "processing" forever
    and its temp file would never be deleted. Closing it here raises
    GeneratorExit inside _mjpeg, which marks the job cancelled and cleans up.
    """

    frames = _mjpeg(job)

    try:
        async for chunk in iterate_in_threadpool(frames):
            yield chunk
    finally:
        frames.close()


# GET  /videos/{id}/stream  -> multipart MJPEG of annotated frames
@router.get("/videos/{video_id}/stream")
def stream_video(video_id: str) -> StreamingResponse:
    with _lock:
        job = _get_job(video_id)

        if job["status"] != "pending":
            raise HTTPException(
                status_code=409,
                detail=f"Video already {job['status']}; upload it again.",
            )

        job["status"] = "processing"

    return StreamingResponse(
        _stream(job),
        media_type=f"multipart/x-mixed-replace; boundary={BOUNDARY}",
        headers={"Cache-Control": "no-store"},
    )


# GET  /videos/{id}/stats  -> live counts + anomaly state (poll it)
@router.get("/videos/{video_id}/stats")
def video_stats(video_id: str) -> dict:
    return _public(_get_job(video_id))
