"""Seed lesson set for the demo.

Small on purpose. Lesson `loops-accumulate` is the one the 120s demo walks
through (see docs/DEMO_SCRIPT.md).
"""

from __future__ import annotations

from app.models.schemas import Lesson, PredictionKind

LESSONS: list[Lesson] = [
    Lesson(
        id="loops-accumulate",
        track="Python Fundamentals",
        unit="Loops → Iteration",
        title="Summing a list",
        order=1,
        concepts=["loops", "iteration", "accumulation", "assignment"],
        starter_code=(
            "numbers = [2, 4, 6]\n"
            "\n"
            "total = 0\n"
            "\n"
            "for number in numbers:\n"
            "    total += number\n"
            "\n"
            "print(total)\n"
        ),
        prediction_kind=PredictionKind.value,
        prediction_prompt="Before you run the code, predict what `total` will be.",
        prediction_target="total",
    ),
    Lesson(
        id="assignment-rebinding",
        track="Python Fundamentals",
        unit="Variables → Assignment",
        title="What `=` really does",
        order=2,
        concepts=["assignment", "variables"],
        starter_code=(
            "x = 10\n"
            "y = x\n"
            "x = 99\n"
            "print(y)\n"
        ),
        prediction_kind=PredictionKind.value,
        prediction_prompt="Predict what `y` will be when this finishes.",
        prediction_target="y",
    ),
    Lesson(
        id="loop-variable-lifetime",
        track="Python Fundamentals",
        unit="Loops → Iteration",
        title="The loop variable after the loop",
        order=3,
        concepts=["loops", "iteration", "scope"],
        starter_code=(
            "for i in range(3):\n"
            "    pass\n"
            "print(i)\n"
        ),
        prediction_kind=PredictionKind.value,
        prediction_prompt="Predict what `i` is after the loop ends.",
        prediction_target="i",
    ),
    Lesson(
        id="function-scope",
        track="Python Fundamentals",
        unit="Functions → Scope",
        title="Local names stay local",
        order=4,
        concepts=["functions", "scope"],
        starter_code=(
            "count = 0\n"
            "\n"
            "def bump():\n"
            "    count = count + 1\n"
            "    return count\n"
            "\n"
            "print(bump())\n"
        ),
        prediction_kind=PredictionKind.output,
        prediction_prompt="Predict what this prints (or whether it errors).",
    ),
]

_BY_ID = {lesson.id: lesson for lesson in LESSONS}


def get_lesson(lesson_id: str) -> Lesson | None:
    return _BY_ID.get(lesson_id)
