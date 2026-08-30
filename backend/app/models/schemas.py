"""Core data model for NOESIS — code execution/tracing only.

These types are the contract between this backend and the frontend for
running/tracing code. Keep `frontend/src/lib/types.ts` in sync with this file.
The annotation/chat types (used only by the AI pipeline, which now lives
entirely in the frontend) are defined there, not here — see
`frontend/src/lib/types.ts`.

Everything that crosses the wire inherits from :class:`Wire`, which serialises
snake_case fields as camelCase. Python stays idiomatic, TypeScript stays
idiomatic, and neither side needs a translation layer that someone forgets to
update.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class Wire(BaseModel):
    """Base for every model the frontend sees.

    Reads either spelling on the way in (``populate_by_name``) and always
    writes camelCase on the way out, so a client that still sends
    ``entry_path`` keeps working.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    def wire(self) -> dict[str, Any]:
        """JSON-ready dict with camelCase keys — use this for WebSocket sends.

        FastAPI already serialises `response_model` by alias, so REST routes
        need nothing extra.
        """
        return self.model_dump(mode="json", by_alias=True)


# ---------------------------------------------------------------------------
# Project files (virtual file system for v1)
# ---------------------------------------------------------------------------


class ProjectFile(Wire):
    """One file in the (currently virtual, browser-held) project."""

    path: str
    content: str = ""
    language: str = "python"  # only "python" is executed/traced today


# ---------------------------------------------------------------------------
# Execution: values, heap, steps
# ---------------------------------------------------------------------------
#
# A traced value is either a JSON primitive (str/int/float/bool/None) or a
# reference `{"$ref": "o3"}` into the step's `heap`. Splitting objects out of
# the variable bindings is what makes aliasing visible: two names holding the
# same `$ref` are two names for one object, which a flattened snapshot can
# never show.

REF_KEY = "$ref"


def make_ref(object_id: str) -> dict[str, str]:
    return {REF_KEY: object_id}


class HeapEntry(Wire):
    """One key/value pair of a traced dict."""

    key: str
    value: Any


class HeapObject(Wire):
    """A non-primitive value, addressable by identity for the whole run."""

    id: str
    type: str  # "list" | "tuple" | "set" | "dict" | "object"
    preview: str  # short human-readable form, e.g. "[1, 2, 3]"
    size: int = 0
    elements: list[Any] | None = None  # list/tuple/set members
    entries: list[HeapEntry] | None = None  # dict items
    truncated: bool = False  # too large to show in full


class TraceStep(Wire):
    """One executed line, with the variable bindings visible afterwards."""

    step: int
    line: int
    source: str = ""
    event: str = "line"  # "line" | "call" | "return" | "exception"
    func: str = "<module>"  # enclosing function, for scope display
    depth: int = 0  # call depth, 0 = module level
    locals: dict[str, Any] = Field(default_factory=dict)
    heap: dict[str, HeapObject] = Field(default_factory=dict)
    stdout: str = ""


class ExecutionTrace(Wire):
    entry_path: str = ""
    steps: list[TraceStep] = Field(default_factory=list)
    final_locals: dict[str, Any] = Field(default_factory=dict)
    final_heap: dict[str, HeapObject] = Field(default_factory=dict)
    stdout: str = ""
    error: str | None = None
    error_line: int | None = None
    truncated: bool = False


class RunRequest(Wire):
    files: list[ProjectFile]
    entry_path: str


# ---------------------------------------------------------------------------
# Note: the annotation types (Anchor, Annotation, AnnotationKind/Tone/Source)
# and the chat types (ChatMessage, ChatRole, ChatRequest, ChatResponse) that
# used to live here moved to the frontend along with the AI pipeline — see
# `frontend/src/lib/types.ts`, which is now their canonical definition. This
# backend no longer has anything to do with them.
# ---------------------------------------------------------------------------
