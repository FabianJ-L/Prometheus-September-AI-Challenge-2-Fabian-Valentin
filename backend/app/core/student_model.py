"""The student mental model.

Turns session evidence (correct/incorrect predictions, resolved misconceptions,
Socratic answers) into per-concept mastery estimates. This is the part the demo
is really about — the LLM is just one input into it.

v1 uses a transparent exponential-moving-average update. Swap for a proper
Bayesian Knowledge Tracing / IRT model later without changing the interface.
"""

from __future__ import annotations

from app.models.schemas import ConceptState, MasteryLevel

# How quickly a single new observation moves the estimate.
_ALPHA = 0.35

_LEVEL_BANDS: list[tuple[float, MasteryLevel]] = [
    (0.80, MasteryLevel.mastered),
    (0.50, MasteryLevel.developing),
    (0.20, MasteryLevel.uncertain),
    (0.0, MasteryLevel.not_assessed),
]


def _level_for(score: float, evidence_count: int) -> MasteryLevel:
    if evidence_count == 0:
        return MasteryLevel.not_assessed
    for threshold, level in _LEVEL_BANDS:
        if score >= threshold:
            return level
    return MasteryLevel.not_assessed


def observe(
    state: ConceptState | None,
    concept_id: str,
    signal: float,
    *,
    weight: float = 1.0,
) -> ConceptState:
    """Fold one observation into ``state`` and return the updated copy.

    ``signal`` is 0..1 where 1 = strong evidence of understanding, 0 = strong
    evidence of a gap. ``weight`` scales how much this observation counts (a
    resolved misconception is worth more than a lucky guess).
    """

    if state is None:
        state = ConceptState(concept_id=concept_id)

    signal = max(0.0, min(1.0, signal))
    step = _ALPHA * weight
    new_score = round((1 - step) * state.score + step * signal, 4)
    new_count = state.evidence_count + 1

    return state.model_copy(
        update={
            "score": new_score,
            "evidence_count": new_count,
            "level": _level_for(new_score, new_count),
        }
    )


def apply_deltas(
    states: dict[str, ConceptState],
    deltas: dict[str, float],
    *,
    weight: float = 1.0,
) -> dict[str, ConceptState]:
    """Apply a batch of ``{concept_id: signal}`` observations, return a new dict."""
    updated = dict(states)
    for concept_id, signal in deltas.items():
        updated[concept_id] = observe(updated.get(concept_id), concept_id, signal, weight=weight)
    return updated


def recommend_next(states: dict[str, ConceptState]) -> str | None:
    """Pick the concept most in need of practice (lowest score with evidence)."""
    assessed = [s for s in states.values() if s.evidence_count > 0]
    if not assessed:
        return None
    return min(assessed, key=lambda s: s.score).concept_id
