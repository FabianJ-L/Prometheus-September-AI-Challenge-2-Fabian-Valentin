"""Aggregate router — mounted at /api in app.main."""

from fastapi import APIRouter

from app.api.routes import health, run, ws

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(run.router, tags=["run"])
api_router.include_router(ws.router, tags=["ws"])
