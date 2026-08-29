"""Workspace orchestration, transport-agnostic.

Both the REST routes (`app/api/routes/run.py`, `app/api/routes/chat.py`) and
the WebSocket (`app/api/routes/ws.py`) drive these functions. The backend is
stateless per call — the frontend owns the virtual file system and chat
history and sends the relevant slice with every request.
"""

from __future__ import annotations

from app.ai.client import get_ai_client
from app.ai.prompts import SYSTEM, build_messages, render_context_block
from app.core.executor import run_trace
from app.models.schemas import ChatMessage, ChatRequest, ChatRole, ExecutionTrace, ProjectFile


class WorkspaceError(ValueError):
    """Raised for bad requests (e.g. unknown entry path); mapped to HTTP 4xx / WS error."""


def handle_run(files: list[ProjectFile], entry_path: str) -> ExecutionTrace:
    entry = next((f for f in files if f.path == entry_path), None)
    if entry is None:
        raise WorkspaceError(f"No file '{entry_path}' in project")
    return run_trace(entry.content, entry_path)


def handle_chat(req: ChatRequest) -> ChatMessage:
    context_block = render_context_block(req.files, req.active_path, req.last_trace)
    messages = build_messages(req.history, req.message, context_block)
    text = get_ai_client().chat(SYSTEM, messages)
    return ChatMessage(role=ChatRole.assistant, content=text)


__all__ = ["WorkspaceError", "handle_chat", "handle_run"]
