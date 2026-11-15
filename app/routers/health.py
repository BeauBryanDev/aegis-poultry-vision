from fastapi import APIRouter

from app.core.config import settings
from app.core.model_session import models_loaded


router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    return {
        "status": "ok" if models_loaded() else "degraded",
        "app": settings.APP_NAME,
        "models_loaded": models_loaded(),
    }
