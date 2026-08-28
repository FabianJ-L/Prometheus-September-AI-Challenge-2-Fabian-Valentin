"""Aggregate router — mounted at /api in app.main."""

from fastapi import APIRouter

from app.api.routes import concepts, health, lessons, sessions, ws

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(lessons.router, prefix="/lessons", tags=["lessons"])
api_router.include_router(concepts.router, prefix="/concepts", tags=["concepts"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
api_router.include_router(ws.router, tags=["ws"])
