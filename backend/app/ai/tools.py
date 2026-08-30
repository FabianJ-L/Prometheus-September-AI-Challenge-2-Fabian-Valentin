"""The annotation vocabulary the assistant can use, and its validation.

The model gets a second output channel besides prose: tool calls that place
marks, notes and diagrams onto specific lines of the user's code. Tool use —
rather than markup parsed out of the reply text — means a malformed annotation
cannot half-render, and every call passes through :func:`build_annotation`
before it ever reaches the UI.

Anchoring by snippet, not by column
-----------------------------------
Every tool anchors with a ``line`` *and* the ``snippet`` the model expects to
find there. Line numbers alone are the single most common way an LLM points at
the wrong code. The snippet turns a guess into something checkable: if it does
not match, the annotation is relocated or dropped. A confident pointer at the
wrong line costs more trust than no pointer at all.

Note on ``strict``
------------------
Strict tool schemas are deliberately not used here. They guarantee the *shape*
of the input, but every call still has to pass the semantic checks below (does
the line exist, does the snippet match), so strict would add an API failure
surface for a guarantee we already have to enforce ourselves.
"""

from __future__ import annotations

import re
from typing import Any

from app.models.schemas import (
    Anchor,
    Annotation,
    AnnotationKind,
    AnnotationSource,
    AnnotationTone,
    ProjectFile,
)

_TONES = ["info", "focus", "success", "warning", "danger"]

_LINE = {"type": "integer", "description": "1-based line number in the file."}
_SNIPPET = {
    "type": "string",
    "description": (
        "The exact source text you expect on that line, copied verbatim from "
        "the file (leading indentation may be omitted). Used to verify you are "
        "pointing at the right line; a mismatch drops the annotation."
    ),
}
_PATH = {"type": "string", "description": "File path. Omit for the active file."}


def _schema(props: dict[str, Any], required: list[str]) -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {"path": _PATH, "line": _LINE, "snippet": _SNIPPET, **props},
        "required": ["line", "snippet", *required],
    }


TOOLS: list[dict[str, Any]] = [
    {
        "name": "mark_line",
        "description": (
            "Draw the student's eye to one whole line. Use when the line itself "
            "is the subject — where execution goes wrong, where a value is set "
            "that they did not expect. Prefer mark_range when a single "
            "expression on the line is the real subject."
        ),
        "input_schema": _schema(
            {
                "tone": {"type": "string", "enum": _TONES},
                "label": {
                    "type": "string",
                    "description": "Optional 2-5 word tag shown at the end of the line.",
                },
            },
            ["tone"],
        ),
    },
    {
        "name": "mark_range",
        "description": (
            "Emphasise one expression inside a line — the precise thing you are "
            "pointing at. This is the sharpest tool you have; reach for it "
            "instead of describing a location in prose."
        ),
        "input_schema": _schema(
            {
                "text": {
                    "type": "string",
                    "description": (
                        "The exact substring of that line to emphasise, e.g. "
                        "'total + w'. Must occur in the line verbatim."
                    ),
                },
                "tone": {"type": "string", "enum": _TONES},
                "label": {
                    "type": "string",
                    "description": "Optional 2-5 word tag shown floating beside it.",
                },
            },
            ["text", "tone"],
        ),
    },
    {
        "name": "add_note",
        "description": (
            "Write a short comment into the editor, between the lines, directly "
            "under the code it is about. This is where a guiding question "
            "belongs when it concerns one specific place in the code."
        ),
        "input_schema": _schema(
            {
                "body": {
                    "type": "string",
                    "description": (
                        "Markdown. Two or three sentences at most — this sits "
                        "inside the editor and pushes the code apart. "
                        "**bold** and `code` are supported."
                    ),
                }
            },
            ["body"],
        ),
    },
    {
        "name": "flag_problem",
        "description": (
            "Underline a line the way a compiler error does, with a message on "
            "hover. Reserve this for something demonstrably wrong — a real "
            "error or a definite bug — not for a stylistic opinion."
        ),
        "input_schema": _schema(
            {
                "severity": {"type": "string", "enum": ["warning", "error"]},
                "message": {"type": "string", "description": "One sentence."},
            },
            ["severity", "message"],
        ),
    },
    {
        "name": "focus_step",
        "description": (
            "Move the student's step debugger to a specific step of the last "
            "run, so 'look at what happens here' actually takes them there. Use "
            "it when the answer lives at a particular moment of execution — the "
            "step where a value first goes wrong, where a loop turns over, where "
            "the object gets mutated. Step numbers come from the trace you were "
            "given. Use at most once per reply."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "step": {
                    "type": "integer",
                    "description": "1-based step number from the run, as shown in the trace.",
                },
                "because": {
                    "type": "string",
                    "description": "Short reason, shown to the student. 3-8 words.",
                },
            },
            "required": ["step", "because"],
        },
    },
    {
        "name": "show_memory",
        "description": (
            "Open a memory diagram under a line, showing which names point at "
            "which objects. Use it when the confusion is about references — "
            "aliasing, mutation, or 'why did changing one change the other'. "
            "Requires a previous run."
        ),
        "input_schema": _schema(
            {
                "variables": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Variable names to focus on. Empty means all.",
                }
            },
            ["variables"],
        ),
    },
]


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


def _normalise(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _resolve_anchor(
    files: list[ProjectFile],
    active_path: str | None,
    raw: dict[str, Any],
) -> tuple[Anchor, str] | None:
    """Turn raw tool input into a verified anchor plus the line's real text.

    Returns ``None`` when the anchor cannot be trusted: unknown file, line out
    of range, or a snippet that matches nothing.
    """
    path = raw.get("path") or active_path
    target = next((f for f in files if f.path == path), None)
    if target is None:
        target = next((f for f in files if f.path == active_path), None) or (files[0] if files else None)
    if target is None:
        return None

    lines = target.content.splitlines()
    if not lines:
        return None

    try:
        line = int(raw.get("line", 0))
    except (TypeError, ValueError):
        return None

    snippet = str(raw.get("snippet") or "")
    wanted = _normalise(snippet)

    # Trust the line number only when the snippet agrees with it.
    if 1 <= line <= len(lines) and (not wanted or _normalise(lines[line - 1]) == wanted):
        return Anchor(path=target.path, line=line, snippet=lines[line - 1].strip()), lines[line - 1]

    if not wanted:
        return None

    # The line moved (or was guessed). Relocate — but only on an unambiguous hit.
    matches = [i for i, text in enumerate(lines, start=1) if _normalise(text) == wanted]
    if len(matches) != 1:
        return None
    found = matches[0]
    return Anchor(path=target.path, line=found, snippet=lines[found - 1].strip()), lines[found - 1]


def _tone(value: Any, fallback: AnnotationTone = AnnotationTone.info) -> AnnotationTone:
    try:
        return AnnotationTone(str(value))
    except ValueError:
        return fallback


def _short(value: Any, limit: int = 48) -> str | None:
    if not value:
        return None
    text = " ".join(str(value).split())
    return text if len(text) <= limit else text[: limit - 1] + "…"


def read_focus_step(raw: dict[str, Any], total_steps: int) -> tuple[int, str] | None:
    """Validate a ``focus_step`` call against the run that actually happened.

    Returns a 0-based index plus the reason, or ``None`` when there is no such
    step — a debugger that jumps somewhere arbitrary is worse than one that
    stays put.
    """
    if total_steps <= 0:
        return None
    try:
        step = int(raw.get("step", 0))
    except (TypeError, ValueError):
        return None
    if not 1 <= step <= total_steps:
        return None
    return step - 1, _short(raw.get("because")) or ""


def build_annotation(
    name: str,
    raw: dict[str, Any],
    files: list[ProjectFile],
    active_path: str | None,
    index: int,
) -> Annotation | None:
    """Validate one tool call and turn it into an annotation, or drop it."""

    resolved = _resolve_anchor(files, active_path, raw)
    if resolved is None:
        return None
    anchor, line_text = resolved
    annotation_id = f"ai-{index}"

    if name == "mark_line":
        return Annotation(
            id=annotation_id,
            kind=AnnotationKind.line,
            source=AnnotationSource.ai,
            anchor=anchor,
            tone=_tone(raw.get("tone")),
            label=_short(raw.get("label")),
        )

    if name == "mark_range":
        text = str(raw.get("text") or "")
        column = line_text.find(text)
        if not text or column < 0:
            # The span does not exist on that line — fall back to marking the
            # whole line rather than emphasising an arbitrary stretch of text.
            return Annotation(
                id=annotation_id,
                kind=AnnotationKind.line,
                source=AnnotationSource.ai,
                anchor=anchor,
                tone=_tone(raw.get("tone")),
                label=_short(raw.get("label")),
            )
        anchor.column = column + 1
        anchor.end_column = column + 1 + len(text)
        return Annotation(
            id=annotation_id,
            kind=AnnotationKind.range,
            source=AnnotationSource.ai,
            anchor=anchor,
            tone=_tone(raw.get("tone")),
            label=_short(raw.get("label")),
        )

    if name == "add_note":
        body = str(raw.get("body") or "").strip()
        if not body:
            return None
        return Annotation(
            id=annotation_id,
            kind=AnnotationKind.note,
            source=AnnotationSource.ai,
            anchor=anchor,
            tone=AnnotationTone.info,
            body=body,
        )

    if name == "flag_problem":
        message = str(raw.get("message") or "").strip()
        if not message:
            return None
        severity = AnnotationTone.danger if raw.get("severity") == "error" else AnnotationTone.warning
        return Annotation(
            id=annotation_id,
            kind=AnnotationKind.problem,
            source=AnnotationSource.ai,
            anchor=anchor,
            tone=severity,
            label=message,
        )

    if name == "show_memory":
        raw_vars = raw.get("variables") or []
        variables = [str(v) for v in raw_vars if isinstance(v, (str, int))][:8]
        return Annotation(
            id=annotation_id,
            kind=AnnotationKind.memory,
            source=AnnotationSource.ai,
            anchor=anchor,
            tone=AnnotationTone.info,
            variables=variables,
        )

    return None
