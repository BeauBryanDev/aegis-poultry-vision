from fastapi import FastAPI

from app.core.config import settings
from app.core.lifespan import lifespan
from app.routers import health, video


app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(video.router, prefix=settings.API_PREFIX)
