"""Core data model for NOESIS.

These types are the contract between the backend, the AI pipeline and the
frontend. Keep `frontend/src/lib/types.ts` in sync with this file.
"""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


def _now() -> datetime:
    return datetime.now(UTC)


# ---------------------------------------------------------------------------
# Concepts
# ---------------------------------------------------------------------------


class MasteryLevel(StrEnum):
    mastered = "mastered"
    developing = "developing"
    uncertain = "uncertain"
    not_assessed = "not_assessed"


class ConceptNode(BaseModel):
    """A node in the concept map (see app/data/concepts.py)."""

    id: str
    label: str
    summary: str = ""
    prerequisites: list[str] = Field(default_factory=list)


class ConceptState(BaseModel):
    """Per-student mastery estimate for one concept."""

    concept_id: str
    score: float = 0.0  # 0..1
    level: MasteryLevel = MasteryLevel.not_assessed
    evidence_count: int = 0
    last_updated: datetime = Field(default_factory=_now)


# ---------------------------------------------------------------------------
# Lessons
# ---------------------------------------------------------------------------


class PredictionKind(StrEnum):
    value = "value"  # predict a final value (e.g. `total`)
    output = "output"  # predict stdout
    choice = "choice"  # multiple choice


class Lesson(BaseModel):
    id: str
    track: str  # e.g. "Python Fundamentals"
    unit: str  # e.g. "Loops → Iteration"
    title: str
    order: int = 0
    concepts: list[str] = Field(default_factory=list)
    starter_code: str
    prediction_kind: PredictionKind = PredictionKind.value
    prediction_prompt: str = "Before you run the code, predict what happens."
    prediction_target: str | None = None  # variable name for `value` kind
    choices: list[str] = Field(default_factory=list)  # for `choice` kind
    expected_answer: Any = None  # ground truth, filled after execution if None


# ---------------------------------------------------------------------------
# Prediction / execution
# ---------------------------------------------------------------------------


class Prediction(BaseModel):
    lesson_id: str
    kind: PredictionKind
    answer: Any
    rationale: str | None = None
    submitted_at: datetime = Field(default_factory=_now)


class TraceStep(BaseModel):
    """One executed line, with the variable bindings visible afterwards."""

    step: int
    line: int
    source: str = ""
    event: str = "line"  # "line" | "call" | "return" | "exception"
    locals: dict[str, Any] = Field(default_factory=dict)
    stdout: str = ""


class ExecutionTrace(BaseModel):
    lesson_id: str
    steps: list[TraceStep] = Field(default_factory=list)
    final_locals: dict[str, Any] = Field(default_factory=dict)
    stdout: str = ""
    error: str | None = None
    truncated: bool = False


class PredictionCheck(BaseModel):
    """Result of comparing a prediction against the real trace."""

    matches: bool
    predicted: Any
    actual: Any
    # First step index where the student's model most likely diverged.
    divergence_step: int | None = None
    note: str = ""


# ---------------------------------------------------------------------------
# Diagnosis / teaching
# ---------------------------------------------------------------------------


class Misconception(BaseModel):
    id: str  # e.g. "assignment_vs_accumulation"
    label: str
    description: str
    related_concepts: list[str] = Field(default_factory=list)


class SocraticTurn(BaseModel):
    """One AI move in the guided-questioning loop."""

    role: str = "teacher"  # "teacher" | "student"
    intent: str = "question"  # "question" | "hint" | "prompt" | "confirm"
    text: str
    choices: list[str] = Field(default_factory=list)
    reveals_solution: bool = False
    created_at: datetime = Field(default_factory=_now)


class DiagnosticResult(BaseModel):
    lesson_id: str
    prediction_check: PredictionCheck
    misconception: Misconception | None = None
    confidence: float = 0.0
    concept_deltas: dict[str, float] = Field(default_factory=dict)
    first_turn: SocraticTurn | None = None
    mock: bool = False


# ---------------------------------------------------------------------------
# Session
# ---------------------------------------------------------------------------


class SessionPhase(StrEnum):
    predict = "predict"
    execute = "execute"
    compare = "compare"
    diagnose = "diagnose"
    understand = "understand"
    retry = "retry"
    done = "done"


class SessionState(BaseModel):
    id: str
    lesson_id: str
    phase: SessionPhase = SessionPhase.predict
    started_at: datetime = Field(default_factory=_now)
    prediction: Prediction | None = None
    trace: ExecutionTrace | None = None
    diagnostic: DiagnosticResult | None = None
    turns: list[SocraticTurn] = Field(default_factory=list)
    concept_states: dict[str, ConceptState] = Field(default_factory=dict)
    prediction_accuracy: float | None = None
