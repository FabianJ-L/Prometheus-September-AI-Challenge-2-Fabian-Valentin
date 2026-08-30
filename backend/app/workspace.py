"""Workspace orchestration, transport-agnostic.

Both the REST routes (`app/api/routes/run.py`, `app/api/routes/chat.py`) and
the WebSocket (`app/api/routes/ws.py`) drive these functions. The backend is
stateless per call — the frontend owns the virtual file system and chat
history and sends the relevant slice with every request.
"""

from __future__ import annotations

from app.ai.client import get_ai_client
from app.ai.mock import offline_annotations
from app.ai.prompts import SYSTEM, build_messages, render_context_block
from app.ai.tools import TOOLS, build_annotation, read_focus_step
from app.core.executor import run_trace
from app.models.schemas import (
    Annotation,
    ChatMessage,
    ChatRequest,
    ChatResponse,
    ChatRole,
    ExecutionTrace,
    ProjectFile,
)

# How many annotations one reply may place. Past this the editor stops being a
# lesson and starts being a wall of highlighter.
MAX_ANNOTATIONS = 6


class WorkspaceError(ValueError):
    """Raised for bad requests (e.g. unknown entry path); mapped to HTTP 4xx / WS error."""


def handle_run(files: list[ProjectFile], entry_path: str) -> ExecutionTrace:
    entry = next((f for f in files if f.path == entry_path), None)
    if entry is None:
        raise WorkspaceError(f"No file '{entry_path}' in project")
    return run_trace(entry.content, entry_path)


def handle_chat(req: ChatRequest) -> ChatResponse:
    client = get_ai_client()

    if client.is_mock:
        # No key: say so plainly, and let the trace speak for itself.
        text = client.converse(SYSTEM, [])
        marks = offline_annotations(req.files, req.active_path, req.last_trace, req.anchor)
        for mark in marks:
            mark.thread_id = req.thread_id
        return ChatResponse(
            message=ChatMessage(role=ChatRole.assistant, content=text),
            annotations=marks,
            thread_id=req.thread_id,
            mock=True,
        )

    annotations: list[Annotation] = []
    focus: list[int] = []
    total_steps = len(req.last_trace.steps) if req.last_trace else 0

    def on_tool_call(name: str, payload: dict) -> str:
        """Validate one tool call and tell the model what actually happened.

        The honesty here is deliberate: when an anchor is rejected the model
        finds out inside the same turn, so it can re-anchor instead of writing
        prose about a mark the student cannot see.
        """
        if name == "focus_step":
            resolved = read_focus_step(payload, total_steps)
            if resolved is None:
                return (
                    "Not moved: there is no such step in the last run"
                    f" ({total_steps} steps). Leave the debugger where it is."
                )
            index, _because = resolved
            focus.clear()
            focus.append(index)
            return f"Debugger moved to step {index + 1}."

        if len(annotations) >= MAX_ANNOTATIONS:
            return "Annotation limit reached for this reply. Say the rest in your text."

        annotation = build_annotation(name, payload, req.files, req.active_path, len(annotations))
        if annotation is None:
            return (
                "Not placed: no line matches that snippet. Copy the line "
                "verbatim from the file above, or leave this point to your text."
            )

        annotation.thread_id = req.thread_id
        annotations.append(annotation)
        return f"Placed on line {annotation.anchor.line}."

    context = render_context_block(
        req.files, req.active_path, req.last_trace, req.debug_step_index, req.anchor
    )
    messages = build_messages(req.history, req.message, context)
    text = client.converse(SYSTEM, messages, tools=TOOLS, on_tool_call=on_tool_call)

    return ChatResponse(
        message=ChatMessage(role=ChatRole.assistant, content=text),
        annotations=annotations,
        thread_id=req.thread_id,
        focus_step=focus[0] if focus else None,
        mock=False,
    )


__all__ = ["MAX_ANNOTATIONS", "WorkspaceError", "handle_chat", "handle_run"]
