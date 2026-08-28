"""Taxonomy of common beginner misconceptions.

The classifier (LLM or heuristic) must map a divergence onto one of these ids so
the student model can attribute it to concepts and track it over time.
"""

from __future__ import annotations

from app.models.schemas import Misconception

MISCONCEPTIONS: list[Misconception] = [
    Misconception(
        id="assignment_vs_accumulation",
        label="Assignment replaces, it doesn't add",
        description=(
            "Student expects `total += x` (or `total = total + x`) to keep every "
            "previous value rather than replace `total` with a new single value."
        ),
        related_concepts=["assignment", "accumulation"],
    ),
    Misconception(
        id="loop_resets_accumulator",
        label="The loop re-initialises the accumulator each pass",
        description=(
            "Student believes a variable assigned before the loop is reset to its "
            "initial value at the start of every iteration."
        ),
        related_concepts=["loops", "iteration", "assignment"],
    ),
    Misconception(
        id="reference_semantics",
        label="`y = x` copies the value forever",
        description=(
            "Student expects a name bound from another name to track later "
            "reassignments of the original (or, for mutables, misjudges aliasing)."
        ),
        related_concepts=["assignment", "references"],
    ),
    Misconception(
        id="loop_var_undefined_after",
        label="The loop variable disappears after the loop",
        description=(
            "Student expects the loop variable to be undefined once the loop ends, "
            "rather than holding its last value."
        ),
        related_concepts=["loops", "scope"],
    ),
    Misconception(
        id="closure_over_outer_scope",
        label="A function can freely reassign an outer variable",
        description=(
            "Student expects `x = x + 1` inside a function to read and update the "
            "module-level `x` without `global`/`nonlocal` (gets UnboundLocalError)."
        ),
        related_concepts=["functions", "scope"],
    ),
    Misconception(
        id="off_by_one_range",
        label="`range(n)` includes n",
        description="Student expects `range(n)` to yield `1..n` or `0..n` inclusive.",
        related_concepts=["iteration", "loops"],
    ),
]

_BY_ID = {m.id: m for m in MISCONCEPTIONS}


def get(misconception_id: str) -> Misconception | None:
    return _BY_ID.get(misconception_id)


def ids() -> list[str]:
    return list(_BY_ID)
