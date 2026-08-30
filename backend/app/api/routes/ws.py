"""WebSocket transport for the workspace: run/trace + chat.

Message envelope (both directions): ``{"type": "...", "payload": {...}}``
Payload keys are camelCase — see `app/models/schemas.py`.

Client → server:
  run_code       {"files": [<ProjectFile>...], "entryPath": "main.py"}
  chat_message   {"message": "...", "history": [<ChatMessage>...],
                  "files": [<ProjectFile>...], "activePath": "main.py",
                  "lastTrace": <ExecutionTrace> | null,
                  "debugStepIndex": <int> | null,
                  "anchor": <Anchor> | null, "threadId": "..." | null}

Server → client:
  trace_batch         {"steps": [<TraceStep>...]}   streamed while a run replays
  run_result          {<ExecutionTrace>}            final trace after run_code
  annotations         {"annotations": [<Annotation>...]}  editor marks for a reply
  focus_step          {"index": <int>}              move the step debugger
  assistant_message   {<ChatMessage>, "threadId": ...}  full (non-streamed) reply
  error               {"message": "..."}

Annotations are sent *before* the message they belong to, so the editor is
already marked up when the reply lands next to it.

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

# Steps are streamed in batches so the run reads as progressive without the
# transport pacing the animation: the step debugger has its own play speed, and
# a per-step delay meant a 2000-step trace took minutes to arrive.
_BATCH_SIZE = 40
_BATCH_DELAY_SECONDS = 0.04


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
                entry_path = payload.get("entryPath") or payload.get("entry_path")
                trace = await asyncio.to_thread(workspace.handle_run, files, entry_path)
                for start in range(0, len(trace.steps), _BATCH_SIZE):
                    chunk = trace.steps[start : start + _BATCH_SIZE]
                    await ws.send_json(
                        {"type": "trace_batch", "payload": {"steps": [s.wire() for s in chunk]}}
                    )
                    await asyncio.sleep(_BATCH_DELAY_SECONDS)
                await ws.send_json({"type": "run_result", "payload": trace.wire()})

            elif mtype == "chat_message":
                req = ChatRequest(**payload)
                reply = await asyncio.to_thread(workspace.handle_chat, req)
                if reply.annotations:
                    await ws.send_json(
                        {
                            "type": "annotations",
                            "payload": {"annotations": [a.wire() for a in reply.annotations]},
                        }
                    )
                if reply.focus_step is not None:
                    await ws.send_json(
                        {"type": "focus_step", "payload": {"index": reply.focus_step}}
                    )
                await ws.send_json(
                    {
                        "type": "assistant_message",
                        "payload": {**reply.message.wire(), "threadId": reply.thread_id},
                    }
                )

            else:
                await ws.send_json({"type": "error", "payload": {"message": f"unknown type '{mtype}'"}})

    except WebSocketDisconnect:
        return
    except (workspace.WorkspaceError, KeyError, ValidationError) as exc:
        await ws.send_json({"type": "error", "payload": {"message": str(exc) or "bad request"}})
        await ws.close()
