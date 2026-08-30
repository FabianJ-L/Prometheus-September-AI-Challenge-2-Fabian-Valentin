"""Core data model for NOESIS.

These types are the contract between the backend, the AI pipeline and the
frontend. Keep `frontend/src/lib/types.ts` in sync with this file.

Everything that crosses the wire inherits from :class:`Wire`, which serialises
snake_case fields as camelCase. Python stays idiomatic, TypeScript stays
idiomatic, and neither side needs a translation layer that someone forgets to
update.
"""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


def _now() -> datetime:
    return datetime.now(UTC)


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
# Annotations: the editor's second output channel
# ---------------------------------------------------------------------------


class AnnotationKind(StrEnum):
    line = "line"  # whole-line decoration, optional gutter glyph
    range = "range"  # inline span: weight/colour, optional floating label
    note = "note"  # block between the lines, markdown body
    problem = "problem"  # squiggle + message, via Monaco markers
    value = "value"  # inline value after the line (measured only)
    memory = "memory"  # block hosting the memory diagram


class AnnotationTone(StrEnum):
    neutral = "neutral"
    info = "info"
    focus = "focus"
    success = "success"
    warning = "warning"
    danger = "danger"


class AnnotationSource(StrEnum):
    """Where an annotation's claim comes from.

    ``measured`` is derived from the trace and cannot be wrong. ``ai`` is an
    interpretation and can be. The UI renders them in visibly different
    languages, and that distinction is load-bearing — not decoration.
    """

    measured = "measured"
    ai = "ai"


class Anchor(Wire):
    """Where an annotation attaches.

    ``snippet`` is the text the author expected to find at ``line``. It is what
    makes the anchor verifiable: the backend refuses to emit an annotation
    whose snippet does not match the real file, and the frontend uses it to
    detect when the user has edited the code out from under an annotation.
    """

    path: str
    line: int
    end_line: int | None = None
    column: int | None = None
    end_column: int | None = None
    snippet: str | None = None


class Annotation(Wire):
    id: str
    kind: AnnotationKind
    source: AnnotationSource
    anchor: Anchor
    tone: AnnotationTone = AnnotationTone.neutral
    label: str | None = None  # short inline text
    body: str | None = None  # markdown, for notes
    variables: list[str] = Field(default_factory=list)  # for memory
    thread_id: str | None = None  # the conversation that placed it
    stale: bool = False


# ---------------------------------------------------------------------------
# Chat (Socratic coding assistant)
# ---------------------------------------------------------------------------


class ChatRole(StrEnum):
    user = "user"
    assistant = "assistant"


class ChatMessage(Wire):
    role: ChatRole
    content: str
    created_at: datetime = Field(default_factory=_now)


class ChatRequest(Wire):
    """One turn of one conversation.

    ``anchor`` is what makes an in-editor question different from a chat
    message: the student asked *at* a line, so the assistant never has to guess
    which part of the file "this" refers to — and neither does the student have
    to describe it.
    """

    message: str
    history: list[ChatMessage] = Field(default_factory=list)
    files: list[ProjectFile] = Field(default_factory=list)
    active_path: str | None = None
    last_trace: ExecutionTrace | None = None
    debug_step_index: int | None = None
    anchor: Anchor | None = None
    thread_id: str | None = None


class ChatResponse(Wire):
    message: ChatMessage
    annotations: list[Annotation] = Field(default_factory=list)
    thread_id: str | None = None
    #: Step the assistant wants the debugger moved to, so "look at what happens
    #: here" actually takes the student there instead of asking them to find it.
    focus_step: int | None = None
    mock: bool = False
