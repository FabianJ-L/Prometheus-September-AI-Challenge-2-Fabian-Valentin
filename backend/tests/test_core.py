from app.core.executor import run_trace
from app.core.parser import summarize


def test_parser_flags_accumulation_loop():
    s = summarize("total = 0\nfor n in [1, 2]:\n    total += n\n")
    assert s.valid
    assert s.has_loop
    assert s.has_augmented_assignment


def test_parser_reports_syntax_error():
    s = summarize("for x in :\n")
    assert not s.valid
    assert s.syntax_error


def test_executor_sums_a_list():
    source = "total = 0\nfor n in [2, 4, 6]:\n    total += n\nprint(total)\n"
    trace = run_trace(source, entry_path="main.py")
    assert trace.error is None
    assert trace.final_locals["total"] == 12
    assert trace.stdout.strip() == "12"
    assert len(trace.steps) > 3


def test_executor_times_out_on_infinite_loop():
    trace = run_trace("while True:\n    pass\n")
    assert trace.truncated is True
