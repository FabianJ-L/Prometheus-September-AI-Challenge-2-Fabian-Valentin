"""Workspace orchestration, transport-agnostic.

Both the REST route (`app/api/routes/run.py`) and the WebSocket
(`app/api/routes/ws.py`) drive `handle_run`. The backend is stateless per
call — the frontend owns the virtual file system and sends the relevant
slice with every request.

The Socratic chat / annotation AI pipeline that used to live here has moved to
the Next.js frontend (`frontend/src/app/api/ai/chat/route.ts` and
`frontend/src/lib/ai/*`) — this backend only executes/traces code, which
needs the Python sandbox and can't move to the browser.
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
