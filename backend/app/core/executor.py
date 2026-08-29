"""Step-by-step execution tracer.

Runs a single Python file and records the state after **every executed line**:
the current line, the visible local bindings and anything printed so far. That
trace is what the UI animates and what the chat assistant is given as context
about "what actually happened" when it answers a debugging question.

⚠️  Sandboxing note
------------------
This is a *teaching* runner for small, trusted snippets, not a security
boundary. It caps steps/time and swaps in a reduced ``__builtins__`` (no
``import``, ``open``, ``input``, ...), so it also can't yet run code that
imports other project files. Before accepting arbitrary/untrusted code in a
deployed setting, move this to a real isolate (subprocess + seccomp, container,
or a WASM runtime such as Pyodide). Tracked in docs/ARCHITECTURE.md.
"""

from __future__ import annotations

import builtins
import io
import sys
import threading
from typing import Any

from app.config import get_settings
from app.models.schemas import ExecutionTrace, TraceStep

# Names the snippet is allowed to touch. Deliberately small.
_ALLOWED_BUILTINS = (
    "abs", "all", "any", "bool", "dict", "divmod", "enumerate", "filter",
    "float", "int", "len", "list", "map", "max", "min", "print", "range",
    "reversed", "round", "set", "sorted", "str", "sum", "tuple", "zip",
    "True", "False", "None",
)
_SAFE_BUILTINS: dict[str, Any] = {
    name: getattr(builtins, name) for name in _ALLOWED_BUILTINS if hasattr(builtins, name)
}

_JSON_SAFE = (str, int, float, bool, type(None))


def _snapshot(value: Any) -> Any:
    """Best-effort JSON-serialisable copy of a runtime value."""
    if isinstance(value, _JSON_SAFE):
        return value
    if isinstance(value, (list, tuple, set)):
        return [_snapshot(v) for v in value]
    if isinstance(value, dict):
        return {str(k): _snapshot(v) for k, v in value.items()}
    return repr(value)


def _visible_locals(frame_locals: dict[str, Any]) -> dict[str, Any]:
    return {
        k: _snapshot(v)
        for k, v in frame_locals.items()
        if not k.startswith("__")
    }


def run_trace(source: str, entry_path: str = "") -> ExecutionTrace:
    """Execute ``source`` and return an :class:`ExecutionTrace`."""

    settings = get_settings()
    lines = source.splitlines()
    stdout = io.StringIO()
    trace = ExecutionTrace(entry_path=entry_path)
    state = {"step": 0, "stop": False}

    def tracer(frame, event, arg):  # noqa: ANN001 - CPython trace signature
        if state["stop"] or frame.f_code.co_filename != "<noesis>":
            return tracer
        if event not in ("line", "return", "exception"):
            return tracer

        state["step"] += 1
        if state["step"] > settings.exec_max_steps:
            state["stop"] = True
            trace.truncated = True
            raise _StepLimit

        lineno = frame.f_lineno
        src = lines[lineno - 1].strip() if 0 < lineno <= len(lines) else ""
        trace.steps.append(
            TraceStep(
                step=state["step"],
                line=lineno,
                source=src,
                event=event,
                locals=_visible_locals(frame.f_locals),
                stdout=stdout.getvalue(),
            )
        )
        return tracer

    compiled = compile(source, "<noesis>", "exec")
    sandbox_globals: dict[str, Any] = {"__builtins__": _SAFE_BUILTINS, "__name__": "__main__"}

    def _execute() -> None:
        real_stdout = sys.stdout
        sys.stdout = stdout
        sys.settrace(tracer)
        try:
            exec(compiled, sandbox_globals, sandbox_globals)  # noqa: S102 - intentional
        except _StepLimit:
            pass
        except Exception as exc:  # noqa: BLE001 - surface any runtime error to the UI
            trace.error = f"{type(exc).__name__}: {exc}"
        finally:
            sys.settrace(None)
            sys.stdout = real_stdout

    worker = threading.Thread(target=_execute, daemon=True)
    worker.start()
    worker.join(timeout=settings.exec_timeout_seconds)
    if worker.is_alive():
        state["stop"] = True
        trace.truncated = True
        trace.error = trace.error or "Execution timed out."

    trace.stdout = stdout.getvalue()
    trace.final_locals = {
        k: _snapshot(v) for k, v in sandbox_globals.items() if not k.startswith("__")
    }
    return trace


class _StepLimit(Exception):
    """Raised internally to abort a runaway snippet."""
