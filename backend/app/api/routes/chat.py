"""REST fallback for a single chat turn. The WebSocket is the primary
transport for the live UI; this exists for tests and non-WS clients."""

from __future__ import annotations

from fastapi import APIRouter

from app import workspace
from app.models.schemas import ChatRequest, ChatResponse

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    return workspace.handle_chat(req)
