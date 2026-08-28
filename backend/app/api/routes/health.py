from fastapi import APIRouter

from app import __version__
from app.ai.client import get_ai_client
from app.config import get_settings

router = APIRouter()


@router.get("/health")
def health() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "version": __version__,
        "env": settings.env,
        "ai_mode": "mock" if get_ai_client().is_mock else "live",
        "ai_model": settings.ai_model,
    }
