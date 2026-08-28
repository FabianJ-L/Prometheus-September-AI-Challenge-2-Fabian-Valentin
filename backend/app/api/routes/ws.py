"""WebSocket transport for the learning loop.

Message envelope (both directions): ``{"type": "...", "payload": {...}}``

Client → server:
  start        {"lesson_id": "loops-accumulate"}
  prediction   {"answer": 12, "rationale": "..."}
  answer       {"text": "because = replaces the value"}

Server → client:
  session      {<SessionState>}          full state after every transition
  step         {<TraceStep>}             streamed one-by-one during EXECUTE
  error        {"message": "..."}
"""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app import loop, store

router = APIRouter()

_STEP_DELAY_SECONDS = 0.35  # pacing for the UI animation


@router.websocket("/ws/session")
async def session_socket(ws: WebSocket) -> None:
    await ws.accept()
    session_id: str | None = None
    try:
        while True:
            msg = await ws.receive_json()
            mtype = msg.get("type")
            payload = msg.get("payload") or {}

            if mtype == "start":
                session = await asyncio.to_thread(loop.start_session, payload["lesson_id"])
                session_id = session.id
                await ws.send_json({"type": "session", "payload": session.model_dump(mode="json")})

            elif mtype == "prediction":
                _need(session_id)
                session = await asyncio.to_thread(
                    loop.submit_prediction, session_id, payload.get("answer"), payload.get("rationale")
                )
                if session.trace:
                    for step in session.trace.steps:
                        await ws.send_json({"type": "step", "payload": step.model_dump(mode="json")})
                        await asyncio.sleep(_STEP_DELAY_SECONDS)
                await ws.send_json({"type": "session", "payload": session.model_dump(mode="json")})

            elif mtype == "answer":
                _need(session_id)
                session = await asyncio.to_thread(loop.submit_answer, session_id, payload.get("text", ""))
                await ws.send_json({"type": "session", "payload": session.model_dump(mode="json")})

            elif mtype == "resync":
                _need(session_id)
                session = store.get_session(session_id)
                await ws.send_json({"type": "session", "payload": session.model_dump(mode="json")})

            else:
                await ws.send_json({"type": "error", "payload": {"message": f"unknown type '{mtype}'"}})

    except WebSocketDisconnect:
        return
    except (loop.LoopError, KeyError, _NeedSession) as exc:
        await ws.send_json({"type": "error", "payload": {"message": str(exc) or "bad request"}})
        await ws.close()


class _NeedSession(RuntimeError):
    pass


def _need(session_id: str | None) -> None:
    if not session_id:
        raise _NeedSession("send a 'start' message first")
