from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import settings
from app.core.logging import logger
from app.core.model_session import close_model_sessions, initialize_models


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the model on startup, release it on shutdown."""

    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    initialize_models()
    logger.info("Model loaded: chicken detector (%s)", settings.YOLO_MODEL_PATH)

    yield

    close_model_sessions()
