"""System prompt + context/message builders for the Socratic coding assistant.

Kept in one file so they're easy to iterate on during the hackathon.
"""

from __future__ import annotations

from app.models.schemas import ChatMessage, ExecutionTrace, ProjectFile

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

Hard rules:
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


def render_context_block(
    files: list[ProjectFile],
    active_path: str | None,
    last_trace: ExecutionTrace | None,
) -> str:
    """Render a deterministic markdown context block. No AI call."""

    parts: list[str] = []

    active_file = _find(files, active_path) or (files[0] if files else None)
    if active_file is not None:
        parts.append(f"## Active file: `{active_file.path}`\n```python\n{active_file.content}\n```")
    else:
        parts.append("## Active file\n(no file open)")

    others = [f.path for f in files if active_file is None or f.path != active_file.path]
    if others:
        parts.append("Also in project: " + ", ".join(others))

    if last_trace is not None:
        if last_trace.error:
            parts.append(f"## Last run\nError: {last_trace.error}")
        else:
            parts.append(
                "## Last run\n"
                f"stdout:\n```\n{last_trace.stdout}\n```\n"
                f"final variables: {last_trace.final_locals}"
            )

    return "\n\n".join(parts)


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
