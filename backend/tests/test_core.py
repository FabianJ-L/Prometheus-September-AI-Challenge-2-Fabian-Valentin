from app.ai.prompts import build_messages, render_context_block
from app.core.executor import run_trace
from app.core.parser import summarize
from app.models.schemas import ChatMessage, ChatRole, ExecutionTrace, ProjectFile


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


def test_render_context_block_includes_active_file_and_error():
    files = [ProjectFile(path="main.py", content="print(1/0)")]
    trace = ExecutionTrace(entry_path="main.py", error="ZeroDivisionError: division by zero")
    block = render_context_block(files, "main.py", trace)
    assert "main.py" in block
    assert "print(1/0)" in block
    assert "ZeroDivisionError" in block


def test_build_messages_appends_context_to_new_turn():
    history = [
        ChatMessage(role=ChatRole.user, content="hi"),
        ChatMessage(role=ChatRole.assistant, content="hello"),
    ]
    messages = build_messages(history, "why is this wrong?", "## context")
    assert messages[0] == {"role": "user", "content": "hi"}
    assert messages[1] == {"role": "assistant", "content": "hello"}
    assert messages[-1]["role"] == "user"
    assert "## context" in messages[-1]["content"]
    assert "why is this wrong?" in messages[-1]["content"]
