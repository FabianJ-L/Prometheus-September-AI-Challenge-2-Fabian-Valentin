"""WebSocket transport for the workspace: run/trace + chat.

Message envelope (both directions): ``{"type": "...", "payload": {...}}``

Client → server:
  run_code       {"files": [<ProjectFile>...], "entry_path": "main.py"}
  chat_message   {"message": "...", "history": [<ChatMessage>...],
                  "files": [<ProjectFile>...], "active_path": "main.py",
                  "last_trace": <ExecutionTrace> | null}

Server → client:
  trace_step         {<TraceStep>}            streamed one-by-one during run_code
  run_result          {<ExecutionTrace>}       final trace after run_code completes
  assistant_message   {<ChatMessage>}          full (non-streamed) reply after chat_message
  error                {"message": "..."}

Stateless: every message carries the full context it needs (files, chat
history). There is no server-side session.
"""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from app import workspace
from app.models.schemas import ChatRequest, ProjectFile

router = APIRouter()

_STEP_DELAY_SECONDS = 0.35  # pacing for the UI animation


@router.websocket("/ws/workspace")
async def workspace_socket(ws: WebSocket) -> None:
    await ws.accept()
    try:
        while True:
            msg = await ws.receive_json()
            mtype = msg.get("type")
            payload = msg.get("payload") or {}

            if mtype == "run_code":
                files = [ProjectFile(**f) for f in payload["files"]]
                trace = await asyncio.to_thread(workspace.handle_run, files, payload["entry_path"])
                for step in trace.steps:
                    await ws.send_json({"type": "trace_step", "payload": step.model_dump(mode="json")})
                    await asyncio.sleep(_STEP_DELAY_SECONDS)
                await ws.send_json({"type": "run_result", "payload": trace.model_dump(mode="json")})

            elif mtype == "chat_message":
                req = ChatRequest(**payload)
                reply = await asyncio.to_thread(workspace.handle_chat, req)
                await ws.send_json({"type": "assistant_message", "payload": reply.model_dump(mode="json")})

            else:
                await ws.send_json({"type": "error", "payload": {"message": f"unknown type '{mtype}'"}})

    except WebSocketDisconnect:
        return
    except (workspace.WorkspaceError, KeyError, ValidationError) as exc:
        await ws.send_json({"type": "error", "payload": {"message": str(exc) or "bad request"}})
        await ws.close()
