"""The learning loop, transport-agnostic.

    start → predict → execute → compare → diagnose → (answer …) → retry

Both the REST routes (`app/api/routes/sessions.py`) and the WebSocket
(`app/api/routes/ws.py`) drive these functions.
"""

from __future__ import annotations

from typing import Any

from app import store
from app.ai.diagnostic import diagnose
from app.core import student_model
from app.core.executor import run_trace
from app.core.trace import accuracy_from_checks, check_prediction
from app.data.lessons import get_lesson
from app.models.schemas import (
    Prediction,
    PredictionKind,
    SessionPhase,
    SessionState,
    SocraticTurn,
)


class LoopError(ValueError):
    """Raised for bad transitions / unknown ids; mapped to HTTP 4xx by callers."""


def start_session(lesson_id: str) -> SessionState:
    lesson = get_lesson(lesson_id)
    if lesson is None:
        raise LoopError(f"No lesson '{lesson_id}'")
    session = SessionState(
        id=store.new_session_id(),
        lesson_id=lesson_id,
        phase=SessionPhase.predict,
        concept_states=dict(store.concept_states),
    )
    return store.save_session(session)


def submit_prediction(session_id: str, answer: Any, rationale: str | None = None) -> SessionState:
    session = _require(session_id)
    lesson = get_lesson(session.lesson_id)
    if lesson is None:
        raise LoopError(f"No lesson '{session.lesson_id}'")
    if session.phase not in (SessionPhase.predict, SessionPhase.retry):
        raise LoopError(f"Cannot submit a prediction while phase is '{session.phase}'")

    prediction = Prediction(lesson_id=lesson.id, kind=lesson.prediction_kind, answer=answer, rationale=rationale)
    trace = run_trace(lesson.starter_code, lesson.id)
    check = check_prediction(prediction, trace, target=lesson.prediction_target)
    result = diagnose(lesson.starter_code, trace, prediction, check)
    result.lesson_id = lesson.id

    # Fold the evidence into the student model.
    updated_states = student_model.apply_deltas(
        session.concept_states,
        result.concept_deltas or _default_deltas(lesson.concepts, check.matches),
        weight=1.0 if check.matches else 1.3,
    )
    store.concept_states.update(updated_states)

    session.prediction = prediction
    session.trace = trace
    session.diagnostic = result
    session.concept_states = updated_states
    session.turns = [result.first_turn] if result.first_turn else []
    session.prediction_accuracy = accuracy_from_checks([check])
    session.phase = SessionPhase.understand if not check.matches else SessionPhase.done
    return store.save_session(session)


def submit_answer(session_id: str, text: str) -> SessionState:
    """Record the student's reply to the current Socratic turn.

    v1 keeps this simple: store the student's turn and a canned follow-up. Wire
    a real multi-turn dialogue through `app.ai` here.
    """
    session = _require(session_id)
    if session.phase != SessionPhase.understand:
        raise LoopError(f"No open question while phase is '{session.phase}'")

    session.turns.append(SocraticTurn(role="student", intent="prompt", text=text))
    session.turns.append(
        SocraticTurn(
            intent="confirm",
            text="Good — now re-run the prediction with that in mind.",
        )
    )
    session.phase = SessionPhase.retry
    return store.save_session(session)


def _require(session_id: str) -> SessionState:
    session = store.get_session(session_id)
    if session is None:
        raise LoopError(f"No session '{session_id}'")
    return session


def _default_deltas(concepts: list[str], matched: bool) -> dict[str, float]:
    signal = 0.85 if matched else 0.25
    return {c: signal for c in concepts}


__all__ = [
    "LoopError",
    "PredictionKind",
    "start_session",
    "submit_answer",
    "submit_prediction",
]
