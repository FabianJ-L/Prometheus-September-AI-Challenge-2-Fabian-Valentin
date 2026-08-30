"""Tests for the annotation layer: wire format, anchoring, offline marks."""

from fastapi.testclient import TestClient

from app.ai.mock import offline_annotations
from app.ai.tools import build_annotation
from app.core.executor import run_trace
from app.main import app
from app.models.schemas import REF_KEY, AnnotationKind, AnnotationSource, ProjectFile

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


# --- anchoring -------------------------------------------------------------


def test_anchor_accepts_a_matching_snippet():
    a = build_annotation(
        "mark_line", {"line": 2, "snippet": "total = 0", "tone": "info"}, FILES, "main.py", 0
    )
    assert a is not None and a.anchor.line == 2
    assert a.source is AnnotationSource.ai


def test_anchor_relocates_when_the_line_number_is_wrong():
    a = build_annotation(
        "mark_line", {"line": 99, "snippet": "return total", "tone": "info"}, FILES, "main.py", 0
    )
    assert a is not None and a.anchor.line == 5


def test_anchor_is_rejected_when_the_snippet_matches_nothing():
    assert (
        build_annotation(
            "mark_line", {"line": 2, "snippet": "total = 999", "tone": "info"}, FILES, "main.py", 0
        )
        is None
    )


def test_ambiguous_snippet_is_rejected_rather_than_guessed():
    files = [ProjectFile(path="main.py", content="x = 1\ny = 2\nx = 1\n")]
    assert (
        build_annotation(
            "mark_line", {"line": 42, "snippet": "x = 1", "tone": "info"}, files, "main.py", 0
        )
        is None
    )


def test_range_columns_are_derived_from_the_text():
    a = build_annotation(
        "mark_range",
        {"line": 4, "snippet": "total = total + w", "text": "total + w", "tone": "focus"},
        FILES,
        "main.py",
        0,
    )
    assert a is not None and a.kind is AnnotationKind.range
    assert SOURCE.splitlines()[3][a.anchor.column - 1 : a.anchor.end_column - 1] == "total + w"


def test_range_falls_back_to_the_line_when_the_span_is_absent():
    a = build_annotation(
        "mark_range",
        {"line": 2, "snippet": "total = 0", "text": "nowhere", "tone": "info"},
        FILES,
        "main.py",
        0,
    )
    assert a is not None and a.kind is AnnotationKind.line


# --- offline mode ----------------------------------------------------------
# A demo without an API key still has to show a marked-up editor.


def test_offline_marks_the_error_line():
    source = "x = 1\ny = 0\nz = x / y\n"
    trace = run_trace(source, "main.py")
    marks = offline_annotations([ProjectFile(path="main.py", content=source)], "main.py", trace)
    assert any(m.kind is AnnotationKind.problem and m.anchor.line == 3 for m in marks)


def test_offline_explains_aliasing_at_the_mutating_line():
    source = "a = [1, 2]\nb = a\nb.append(3)\nprint(a)\n"
    trace = run_trace(source, "main.py")
    marks = offline_annotations([ProjectFile(path="main.py", content=source)], "main.py", trace)
    assert any(m.kind is AnnotationKind.memory for m in marks)
    assert {m.anchor.line for m in marks} == {3}, "the mutation is on line 3, not where it shows up"


def test_offline_annotations_never_claim_to_be_the_model():
    source = "a = [1, 2]\nb = a\nb.append(3)\n"
    trace = run_trace(source, "main.py")
    marks = offline_annotations([ProjectFile(path="main.py", content=source)], "main.py", trace)
    assert marks and all(m.source is AnnotationSource.measured for m in marks)
