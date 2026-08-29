"""REST fallback for running/tracing a file. The WebSocket is the primary
transport for the live UI (streams steps); this exists for tests and
non-WS clients."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app import workspace
from app.models.schemas import ExecutionTrace, RunRequest

router = APIRouter()


@router.post("/run", response_model=ExecutionTrace)
def run(req: RunRequest) -> ExecutionTrace:
    try:
        return workspace.handle_run(req.files, req.entry_path)
    except workspace.WorkspaceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
