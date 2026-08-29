"""Core data model for NOESIS.

These types are the contract between the backend, the AI pipeline and the
frontend. Keep `frontend/src/lib/types.ts` in sync with this file.
"""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


def _now() -> datetime:
    return datetime.now(UTC)


# ---------------------------------------------------------------------------
# Project files (virtual file system for v1)
# ---------------------------------------------------------------------------


class ProjectFile(BaseModel):
    """One file in the (currently virtual, browser-held) project."""

    path: str
    content: str = ""
    language: str = "python"  # only "python" is executed/traced today


# ---------------------------------------------------------------------------
# Execution
# ---------------------------------------------------------------------------


class TraceStep(BaseModel):
    """One executed line, with the variable bindings visible afterwards."""

    step: int
    line: int
    source: str = ""
    event: str = "line"  # "line" | "call" | "return" | "exception"
    locals: dict[str, Any] = Field(default_factory=dict)
    stdout: str = ""


class ExecutionTrace(BaseModel):
    entry_path: str = ""
    steps: list[TraceStep] = Field(default_factory=list)
    final_locals: dict[str, Any] = Field(default_factory=dict)
    stdout: str = ""
    error: str | None = None
    truncated: bool = False


class RunRequest(BaseModel):
    files: list[ProjectFile]
    entry_path: str


# ---------------------------------------------------------------------------
# Chat (Socratic coding assistant)
# ---------------------------------------------------------------------------


class ChatRole(StrEnum):
    user = "user"
    assistant = "assistant"


class ChatMessage(BaseModel):
    role: ChatRole
    content: str
    created_at: datetime = Field(default_factory=_now)


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = Field(default_factory=list)
    files: list[ProjectFile] = Field(default_factory=list)
    active_path: str | None = None
    last_trace: ExecutionTrace | None = None


class ChatResponse(BaseModel):
    message: ChatMessage
    mock: bool = False
