"""System prompt + context builders for the Socratic coding assistant.

Kept in one file so they're easy to iterate on during the hackathon.
"""

from __future__ import annotations

from app.models.schemas import (
    REF_KEY,
    ChatMessage,
    ExecutionTrace,
    HeapObject,
    ProjectFile,
    TraceStep,
)

SYSTEM = """\
You are NOESIS, an AI coding assistant embedded next to a code editor. You
currently help with Python only.

Your default mode is Socratic, not solution-first. When the user is stuck,
confused, or their code errored/misbehaved and they're asking what's wrong or
why it doesn't work: do NOT give the fix immediately. Ask one focused guiding
question at a time — point at a specific line, value, or piece of behavior
when you can — and wait for their reply. Budget roughly 3-4 such guiding
turns (read the number of your own prior turns in the conversation so far —
there is no external counter) before stating the direct answer plainly.

It's fine to skip the Socratic ramp and answer directly when:
- the question is a simple factual/syntax lookup with no bug to diagnose
  (e.g. "what does zip do", "how do I open a file"),
- the user explicitly asks for the answer ("just tell me", "I give up"),
- you've already spent your guiding-question budget and the user is still
  stuck — at that point, explain plainly rather than stalling forever,
- the user is asking for a code review / style opinion rather than debugging
  a concrete failure.

## Annotating the editor

You can write directly into the editor with tools: mark_line, mark_range,
add_note, flag_problem and show_memory. Annotations are your strongest
teaching instrument — pointing beats describing a location in words.

- **Point instead of describing.** Never write "on line 4, the expression
  `total + w`" in prose. Call mark_range on it. Prose then says *why*, and
  the editor says *where*.
- **Anchor honestly.** Every call needs the exact `snippet` of that line,
  copied from the file you were given. An annotation whose snippet doesn't
  match the file is silently dropped, so a guess costs you the annotation.
- **Be sparing.** Two or three annotations per reply. A screen full of marks
  teaches nothing — pick the one place the student's mental model breaks.
- **Match the tool to the claim.** flag_problem is for something
  demonstrably wrong, not for an opinion. show_memory is for reference
  confusion (aliasing, mutation) and needs a previous run.
- **Notes belong in the editor, questions in the chat.** Use add_note for an
  observation tied to one specific place; keep your one guiding question in
  the reply text so the conversation stays readable.
- Your reply text must stand on its own. Someone who cannot see the
  annotations should still understand you.

## Hard rules

- Never claim to have edited the user's file — there is no apply mechanism.
  If you propose a change, show a short snippet and explain why; don't imply
  you already applied it.
- Always ground your answer in the actual file contents, other files in the
  project, and the most recent run's output/error/trace provided to you —
  never generic advice detached from their real code.
- Be concise. Prefer one sharp question or a short paragraph over a wall of
  text.
- If the user pastes non-Python code, say you can currently only run/trace
  Python.
"""


def _render_value(value: object, heap: dict[str, HeapObject], depth: int = 0) -> str:
    """Render a traced value, keeping object identity visible."""
    if isinstance(value, dict) and REF_KEY in value:
        object_id = str(value[REF_KEY])
        obj = heap.get(object_id)
        if obj is None:
            return f"<{object_id}>"
        # The id is what makes aliasing legible to the model: two names showing
        # the same #id are two names for one object.
        return f"{obj.preview} #{object_id}"
    if isinstance(value, str):
        return repr(value)
    return str(value)


def _render_bindings(bindings: dict[str, object], heap: dict[str, HeapObject]) -> str:
    if not bindings:
        return "(none)"
    return ", ".join(f"{name} = {_render_value(value, heap)}" for name, value in bindings.items())


def _aliases(bindings: dict[str, object]) -> list[str]:
    """Groups of names that point at the very same object."""
    by_ref: dict[str, list[str]] = {}
    for name, value in bindings.items():
        if isinstance(value, dict) and REF_KEY in value:
            by_ref.setdefault(str(value[REF_KEY]), []).append(name)
    return [" and ".join(names) for names in by_ref.values() if len(names) > 1]


def _render_step(step: TraceStep, index: int, total: int) -> str:
    scope = step.func if step.func != "<module>" else "module level"
    return (
        f"## Where the student is looking\n"
        f"Step {index + 1} of {total}, line {step.line} ({scope}): `{step.source}`\n"
        f"Variables here: {_render_bindings(step.locals, step.heap)}"
    )


def render_context_block(
    files: list[ProjectFile],
    active_path: str | None,
    last_trace: ExecutionTrace | None,
    debug_step_index: int | None = None,
) -> str:
    """Render a deterministic markdown context block. No AI call."""

    parts: list[str] = []

    active_file = _find(files, active_path) or (files[0] if files else None)
    if active_file is not None:
        numbered = "\n".join(
            f"{n:>3} | {text}" for n, text in enumerate(active_file.content.splitlines(), start=1)
        )
        parts.append(
            f"## Active file: `{active_file.path}`\n"
            "Line numbers are shown for your reference; `snippet` must be the "
            "code only, without the number.\n"
            f"```\n{numbered}\n```"
        )
    else:
        parts.append("## Active file\n(no file open)")

    others = [f.path for f in files if active_file is None or f.path != active_file.path]
    if others:
        parts.append("Also in project: " + ", ".join(others))

    if last_trace is not None:
        parts.append(_render_trace(last_trace))
        if last_trace.steps and debug_step_index is not None:
            index = max(0, min(debug_step_index, len(last_trace.steps) - 1))
            parts.append(_render_step(last_trace.steps[index], index, len(last_trace.steps)))
    else:
        parts.append("## Last run\n(the student hasn't run this yet)")

    return "\n\n".join(parts)


def _render_trace(trace: ExecutionTrace) -> str:
    if trace.error:
        where = f" (line {trace.error_line})" if trace.error_line else ""
        head = f"## Last run\nError{where}: {trace.error}"
    else:
        head = f"## Last run\nstdout:\n```\n{trace.stdout}\n```"

    lines = [head, f"Final variables: {_render_bindings(trace.final_locals, trace.final_heap)}"]
    shared = _aliases(trace.final_locals)
    if shared:
        lines.append(
            "Same object (not copies): " + "; ".join(shared) + ". "
            "Mutating through one name is visible through the other."
        )
    if trace.truncated:
        lines.append("The run hit the step/time limit, so the trace is incomplete.")
    return "\n".join(lines)


def build_messages(
    history: list[ChatMessage],
    new_message: str,
    context_block: str,
) -> list[dict]:
    """Map prior turns + the new user turn into Anthropic-shaped messages.

    Anthropic requires the first message to have role "user". `history` is
    always frontend-supplied conversation turns starting with the user's
    first message, so this holds by construction — but we defensively drop
    any leading assistant messages in case that invariant is ever violated.
    """

    messages: list[dict] = [{"role": m.role.value, "content": m.content} for m in history]
    while messages and messages[0]["role"] != "user":
        messages.pop(0)

    messages.append({"role": "user", "content": f"{context_block}\n\n{new_message}"})
    return messages


def _find(files: list[ProjectFile], path: str | None) -> ProjectFile | None:
    if path is None:
        return None
    return next((f for f in files if f.path == path), None)
