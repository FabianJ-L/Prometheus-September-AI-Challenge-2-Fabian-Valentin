"""Tests for code execution/tracing: wire format, object identity.

(Formerly `test_annotations.py` — the annotation/anchoring tests moved with
the AI pipeline to the frontend; see `frontend/src/lib/ai/tools.ts` and
`frontend/src/lib/ai/mock.ts`. What's left here tests `run_trace`/`/api/run`,
which are unrelated to AI and stay in this backend.)
"""

from fastapi.testclient import TestClient

from app.core.executor import run_trace
from app.main import app
from app.models.schemas import REF_KEY, ProjectFile

client = TestClient(app)

SOURCE = "def summe(werte):\n    total = 0\n    for w in werte:\n        total = total + w\n    return total\n"
FILES = [ProjectFile(path="main.py", content=SOURCE)]


# --- wire format -----------------------------------------------------------
# The frontend reads camelCase. A regression here silently breaks every feature
# that keys off the trace, without raising anything.


def test_run_response_is_camel_case():
    r = client.post(
        "/api/run",
        json={"files": [{"path": "main.py", "content": "x = 1"}], "entryPath": "main.py"},
    )
    assert r.status_code == 200
    data = r.json()
    assert "entryPath" in data
    assert "finalLocals" in data
    assert "entry_path" not in data


def test_run_still_accepts_snake_case_input():
    r = client.post(
        "/api/run",
        json={"files": [{"path": "main.py", "content": "x = 1"}], "entry_path": "main.py"},
    )
    assert r.status_code == 200


# --- object identity -------------------------------------------------------


def test_aliased_names_share_one_reference():
    trace = run_trace("a = [1, 2]\nb = a\nc = list(a)\nb.append(3)\n", "main.py")
    a, b, c = (trace.final_locals[n] for n in ("a", "b", "c"))
    assert a[REF_KEY] == b[REF_KEY], "b = a must not look like a copy"
    assert a[REF_KEY] != c[REF_KEY], "list(a) is a real copy"
    assert trace.final_heap[a[REF_KEY]].preview == "[1, 2, 3]"


def test_self_referencing_container_terminates():
    trace = run_trace("a = []\na.append(a)\n", "main.py")
    assert trace.error is None


def test_error_line_is_reported():
    trace = run_trace("x = 1\ny = 0\nz = x / y\n", "main.py")
    assert trace.error_line == 3


def test_syntax_error_is_reported_not_raised():
    trace = run_trace("def f(\n", "main.py")
    assert trace.error is not None
    assert trace.error_line == 1


def test_frame_info_is_recorded():
    trace = run_trace(SOURCE + "summe([1, 2])\n", "main.py")
    assert any(s.func == "summe" and s.depth == 1 for s in trace.steps)
