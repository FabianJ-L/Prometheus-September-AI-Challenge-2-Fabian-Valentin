"""Workspace orchestration, transport-agnostic.

Both the REST route (`app/api/routes/run.py`) and the WebSocket
(`app/api/routes/ws.py`) drive this function. The backend is stateless per
call — the frontend owns the virtual file system and sends the relevant
slice with every request.

Chat/AI orchestration lives in the frontend (`frontend/src/lib/ai/`) — this
service only runs/traces Python code, since that's the part that genuinely
needs a Python process.
"""

from __future__ import annotations

from app.core.executor import run_trace
from app.models.schemas import ExecutionTrace, ProjectFile


class WorkspaceError(ValueError):
    """Raised for bad requests (e.g. unknown entry path); mapped to HTTP 4xx / WS error."""


def handle_run(files: list[ProjectFile], entry_path: str) -> ExecutionTrace:
    entry = next((f for f in files if f.path == entry_path), None)
    if entry is None:
        raise WorkspaceError(f"No file '{entry_path}' in project")
    return run_trace(entry.content, entry_path)


__all__ = ["WorkspaceError", "handle_run"]
