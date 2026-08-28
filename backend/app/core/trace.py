"""Compare a student's prediction against the real execution trace."""

from __future__ import annotations

from typing import Any

from app.models.schemas import (
    ExecutionTrace,
    Prediction,
    PredictionCheck,
    PredictionKind,
)


def _norm(value: Any) -> Any:
    """Loosely normalise so "12" and 12 compare equal."""
    if isinstance(value, str):
        s = value.strip()
        try:
            if "." in s:
                return float(s)
            return int(s)
        except ValueError:
            return s
    return value


def check_prediction(
    prediction: Prediction,
    trace: ExecutionTrace,
    *,
    target: str | None = None,
) -> PredictionCheck:
    """Return a :class:`PredictionCheck` for ``prediction`` vs ``trace``.

    ``target`` is the variable name to read for ``PredictionKind.value``.
    """

    if prediction.kind == PredictionKind.output:
        actual: Any = trace.stdout.strip()
        predicted = str(prediction.answer).strip()
    elif prediction.kind == PredictionKind.value and target:
        actual = trace.final_locals.get(target)
        predicted = prediction.answer
    else:  # choice
        actual = prediction.answer  # scored by the diagnostic layer, not here
        predicted = prediction.answer

    matches = _norm(predicted) == _norm(actual)
    divergence = None if matches else _first_divergence(trace, target)

    return PredictionCheck(
        matches=matches,
        predicted=predicted,
        actual=actual,
        divergence_step=divergence,
        note="" if matches else "Prediction and execution diverged.",
    )


def _first_divergence(trace: ExecutionTrace, target: str | None) -> int | None:
    """Heuristic: the step where ``target`` first changes value.

    Good enough to focus the UI's "your model diverged here" marker; the AI
    pipeline refines it with the actual reasoning.
    """
    if not target:
        return trace.steps[0].step if trace.steps else None

    previous = object()
    for step in trace.steps:
        if target in step.locals:
            current = step.locals[target]
            if previous is not object() and current != previous:
                return step.step
            previous = current
    return trace.steps[-1].step if trace.steps else None


def accuracy_from_checks(checks: list[PredictionCheck]) -> float:
    if not checks:
        return 0.0
    return round(sum(1 for c in checks if c.matches) / len(checks), 2)
