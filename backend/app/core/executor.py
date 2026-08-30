"""Step-by-step execution tracer.

Runs a single Python file and records the state after **every executed line**:
the current line, the visible local bindings, the objects those bindings point
at, and anything printed so far. That trace is what the UI animates, what the
editor's inline values are drawn from, and what the chat assistant is given as
context about "what actually happened".

Object identity is preserved
----------------------------
Non-primitive values are lifted into a per-step ``heap`` and referenced by a
stable id. Two names holding the same reference are two names for *one* object,
which is exactly what a flattened snapshot cannot express — and exactly the
misconception (aliasing, mutation, "I copied it, didn't I?") this tool exists to
catch.

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
from app.models.schemas import ExecutionTrace, HeapEntry, HeapObject, TraceStep, make_ref

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

_PRIMITIVES = (str, int, float, bool, type(None))

# Bounds on what one step may carry. A teaching snippet that blows past these
# is better shown truncated than shipped as megabytes of JSON per step.
_MAX_ELEMENTS = 100
_MAX_DEPTH = 6
_MAX_STRING = 200
_MAX_PREVIEW = 80


class _Heap:
    """Assigns stable ids to objects for the lifetime of one run.

    Holds a reference to every object it has seen. That is deliberate: CPython
    recycles ``id()`` values once an object is collected, and a recycled id
    would silently make two unrelated objects look like the same one.
    """

    def __init__(self) -> None:
        self._ids: dict[int, str] = {}
        self._keep: list[Any] = []
        self._counter = 0

    def id_for(self, obj: Any) -> str:
        key = id(obj)
        existing = self._ids.get(key)
        if existing is not None:
            return existing
        self._counter += 1
        assigned = f"o{self._counter}"
        self._ids[key] = assigned
        self._keep.append(obj)
        return assigned

    def value(self, obj: Any, into: dict[str, HeapObject], depth: int = 0) -> Any:
        """Convert ``obj`` to a wire value, registering objects in ``into``."""
        if isinstance(obj, _PRIMITIVES):
            if isinstance(obj, str) and len(obj) > _MAX_STRING:
                return obj[:_MAX_STRING] + "…"
            if isinstance(obj, float) and (obj != obj or obj in (float("inf"), float("-inf"))):
                return repr(obj)  # NaN/inf are not valid JSON
            return obj

        object_id = self.id_for(obj)
        if object_id not in into and depth <= _MAX_DEPTH:
            self._describe(obj, object_id, into, depth)
        return make_ref(object_id)

    def _describe(self, obj: Any, object_id: str, into: dict[str, HeapObject], depth: int) -> None:
        # Reserve the slot before recursing, so a self-referencing container
        # (`a = []; a.append(a)`) terminates instead of blowing the stack.
        into[object_id] = HeapObject(id=object_id, type="object", preview="…")

        if isinstance(obj, (list, tuple, set, frozenset)):
            members = list(obj)
            shown = members[:_MAX_ELEMENTS]
            described = HeapObject(
                id=object_id,
                type=type(obj).__name__,
                preview=_preview(obj),
                size=len(members),
                elements=[self.value(m, into, depth + 1) for m in shown],
                truncated=len(members) > _MAX_ELEMENTS,
            )
        elif isinstance(obj, dict):
            items = list(obj.items())
            shown = items[:_MAX_ELEMENTS]
            described = HeapObject(
                id=object_id,
                type="dict",
                preview=_preview(obj),
                size=len(items),
                entries=[HeapEntry(key=_key(k), value=self.value(v, into, depth + 1)) for k, v in shown],
                truncated=len(items) > _MAX_ELEMENTS,
            )
        else:
            described = HeapObject(id=object_id, type=type(obj).__name__, preview=_preview(obj))

        into[object_id] = described


def _preview(obj: Any) -> str:
    try:
        text = repr(obj)
    except Exception:  # noqa: BLE001 - a broken __repr__ must not kill the run
        return f"<{type(obj).__name__}>"
    return text if len(text) <= _MAX_PREVIEW else text[:_MAX_PREVIEW] + "…"


def _key(value: Any) -> str:
    try:
        return value if isinstance(value, str) else repr(value)
    except Exception:  # noqa: BLE001
        return "<key>"


def run_trace(source: str, entry_path: str = "") -> ExecutionTrace:
    """Execute ``source`` and return an :class:`ExecutionTrace`."""

    settings = get_settings()
    lines = source.splitlines()
    stdout = io.StringIO()
    trace = ExecutionTrace(entry_path=entry_path)
    heap = _Heap()
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

        step_heap: dict[str, HeapObject] = {}
        bindings = {
            name: heap.value(value, step_heap)
            for name, value in frame.f_locals.items()
            if not name.startswith("__")
        }

        trace.steps.append(
            TraceStep(
                step=state["step"],
                line=lineno,
                source=src,
                event=event,
                func=frame.f_code.co_name,
                depth=_depth(frame),
                locals=bindings,
                heap=step_heap,
                stdout=stdout.getvalue(),
            )
        )
        return tracer

    try:
        compiled = compile(source, "<noesis>", "exec")
    except SyntaxError as exc:
        trace.error = f"{type(exc).__name__}: {exc.msg}"
        trace.error_line = exc.lineno
        return trace

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
            trace.error_line = _error_line(exc)
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
    final_heap: dict[str, HeapObject] = {}
    trace.final_locals = {
        name: heap.value(value, final_heap)
        for name, value in sandbox_globals.items()
        if not name.startswith("__")
    }
    trace.final_heap = final_heap
    return trace


def _depth(frame: Any) -> int:
    """How many traced frames are below this one — 0 at module level."""
    depth = 0
    parent = frame.f_back
    while parent is not None and parent.f_code.co_filename == "<noesis>":
        depth += 1
        parent = parent.f_back
    return depth


def _error_line(exc: BaseException) -> int | None:
    """Line in the user's snippet where the exception surfaced.

    Walks to the deepest traceback frame that belongs to the snippet, so an
    error raised inside a helper is reported where it actually happened.
    """
    line: int | None = None
    tb = exc.__traceback__
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == "<noesis>":
            line = tb.tb_lineno
        tb = tb.tb_next
    return line


class _StepLimit(Exception):
    """Raised internally to abort a runaway snippet."""
