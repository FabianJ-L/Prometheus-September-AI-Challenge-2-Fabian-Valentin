from app.core.executor import run_trace
from app.core.parser import summarize
from app.core.trace import check_prediction
from app.data.lessons import get_lesson
from app.models.schemas import Prediction, PredictionKind


def test_parser_flags_accumulation_loop():
    s = summarize("total = 0\nfor n in [1, 2]:\n    total += n\n")
    assert s.valid
    assert s.has_loop
    assert s.has_augmented_assignment
    assert "accumulation" in s.concept_ids


def test_parser_reports_syntax_error():
    s = summarize("for x in :\n")
    assert not s.valid
    assert s.syntax_error


def test_trace_sums_list():
    lesson = get_lesson("loops-accumulate")
    trace = run_trace(lesson.starter_code, lesson.id)
    assert trace.error is None
    assert trace.final_locals["total"] == 12
    assert trace.stdout.strip() == "12"
    assert len(trace.steps) > 3


def test_prediction_check_detects_divergence():
    lesson = get_lesson("loops-accumulate")
    trace = run_trace(lesson.starter_code, lesson.id)
    wrong = Prediction(lesson_id=lesson.id, kind=PredictionKind.value, answer=6)
    check = check_prediction(wrong, trace, target="total")
    assert check.matches is False
    assert check.actual == 12
    assert check.divergence_step is not None


def test_prediction_check_accepts_correct_string_answer():
    lesson = get_lesson("loops-accumulate")
    trace = run_trace(lesson.starter_code, lesson.id)
    right = Prediction(lesson_id=lesson.id, kind=PredictionKind.value, answer="12")
    check = check_prediction(right, trace, target="total")
    assert check.matches is True


def test_executor_times_out_on_infinite_loop():
    trace = run_trace("while True:\n    pass\n")
    assert trace.truncated is True
