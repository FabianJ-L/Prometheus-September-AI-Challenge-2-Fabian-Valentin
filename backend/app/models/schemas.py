"""Core data model for NOESIS.

These types are the contract between this service (run/trace only — chat/AI
lives in the frontend) and the frontend. Keep `frontend/src/lib/types.ts` in
sync with `ProjectFile`, `TraceStep` and `ExecutionTrace` below.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

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
