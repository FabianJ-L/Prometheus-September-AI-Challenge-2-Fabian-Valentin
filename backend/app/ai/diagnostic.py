"""The diagnostic pipeline: assemble structured inputs → classify → next move.

`diagnose()` is the single entry point used by the API layer. It works with or
without a live LLM: the heuristic path covers the seed lessons so the demo is
deterministic even offline.
"""

from __future__ import annotations

from app.ai import misconceptions
from app.ai.client import get_ai_client
from app.ai.prompts import SYSTEM, diagnostic_task
from app.core.parser import summarize
from app.models.schemas import (
    DiagnosticResult,
    ExecutionTrace,
    Prediction,
    PredictionCheck,
    SocraticTurn,
)


def build_payload(
    code: str,
    trace: ExecutionTrace,
    prediction: Prediction,
    check: PredictionCheck,
) -> dict:
    return {
        "code": code,
        "summary": summarize(code).as_dict(),
        "trace": [s.model_dump(mode="json") for s in trace.steps],
        "prediction": prediction.model_dump(mode="json"),
        "prediction_check": check.model_dump(mode="json"),
    }


def diagnose(
    code: str,
    trace: ExecutionTrace,
    prediction: Prediction,
    check: PredictionCheck,
) -> DiagnosticResult:
    if check.matches:
        return _confirmed(check)

    payload = build_payload(code, trace, prediction, check)
    ai = get_ai_client()
    raw = ai.complete_json(SYSTEM, diagnostic_task(payload))

    if raw:
        return _from_ai(raw, check, mock=False)
    return _heuristic(code, check, mock=ai.is_mock)


# ---------------------------------------------------------------------------
# builders
# ---------------------------------------------------------------------------


def _confirmed(check: PredictionCheck) -> DiagnosticResult:
    return DiagnosticResult(
        lesson_id="",
        prediction_check=check,
        misconception=None,
        confidence=1.0,
        concept_deltas={},
        first_turn=SocraticTurn(
            intent="confirm",
            text="Model confirmed. Your prediction matched execution exactly — say why it works in one sentence.",
        ),
    )


def _from_ai(raw: dict, check: PredictionCheck, *, mock: bool) -> DiagnosticResult:
    mc = misconceptions.get(raw.get("misconception_id") or "")
    turn_data = raw.get("first_turn") or {}
    turn = SocraticTurn(
        intent=turn_data.get("intent", "question"),
        text=turn_data.get("text", "Walk me through what you expected to happen, line by line."),
        choices=list(turn_data.get("choices", [])),
    )
    return DiagnosticResult(
        lesson_id="",
        prediction_check=check,
        misconception=mc,
        confidence=float(raw.get("confidence", 0.5)),
        concept_deltas={k: float(v) for k, v in (raw.get("concept_deltas") or {}).items()},
        first_turn=turn,
        mock=mock,
    )


def _heuristic(code: str, check: PredictionCheck, *, mock: bool) -> DiagnosticResult:
    """Deterministic fallback keyed on structural features of the seed lessons."""
    s = summarize(code)
    mc = None
    deltas: dict[str, float] = {}
    question = "Before iteration by iteration — what did you expect each step to do to that variable?"

    if s.has_augmented_assignment and s.has_loop:
        mc = misconceptions.get("assignment_vs_accumulation")
        deltas = {"assignment": 0.2, "accumulation": 0.15, "loops": 0.5}
        question = (
            "Just before that line runs, the variable already holds a value. "
            "What does `=` do with the value that was already there?"
        )
    elif "def " in code and s.has_conditional is False and "= " in code and s.defined_functions:
        mc = misconceptions.get("closure_over_outer_scope")
        deltas = {"functions": 0.3, "scope": 0.15}
        question = "Inside the function, where does Python look for that name first — the function, or the module?"
    elif s.has_loop and not s.has_augmented_assignment:
        mc = misconceptions.get("loop_var_undefined_after")
        deltas = {"loops": 0.4, "scope": 0.25}
        question = "When the loop stops, does the loop variable get cleared, or does it keep its last value?"

    return DiagnosticResult(
        lesson_id="",
        prediction_check=check,
        misconception=mc,
        confidence=0.55 if mc else 0.3,
        concept_deltas=deltas,
        first_turn=SocraticTurn(intent="question", text=question),
        mock=mock,
    )
