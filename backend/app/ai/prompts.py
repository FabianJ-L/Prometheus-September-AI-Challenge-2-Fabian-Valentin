"""System + task prompts for the diagnostic model.

Kept in one file so they're easy to iterate on during the hackathon.
"""

from __future__ import annotations

import json

from app.ai.misconceptions import MISCONCEPTIONS

SYSTEM = """\
You are NOESIS, a programming teacher for beginners.

Your job is NOT to fix code. Your job is to locate the gap in the student's
mental model and help them close it themselves.

Hard rules:
- Never write or rewrite the student's code.
- Never state the corrected answer outright before the student has reasoned toward it.
- Prefer one precise question over a paragraph of explanation.
- Point at a specific line / value when you can.
- Be brief. One move at a time.

You are given: the code, a deterministic execution trace, the student's
prediction, and where prediction and reality diverged. Decide the single best
next teaching move.
"""


def _misconception_catalogue() -> str:
    return "\n".join(
        f"- {m.id}: {m.description} (concepts: {', '.join(m.related_concepts)})"
        for m in MISCONCEPTIONS
    )


def diagnostic_task(payload: dict) -> str:
    """Render the user-turn prompt for a diagnosis request.

    ``payload`` carries the code summary, trace, prediction and prediction check
    (see app/ai/diagnostic.py:build_payload).
    """
    return f"""\
Analyse this attempt.

## Code
```python
{payload['code']}
```

## Structural summary
{json.dumps(payload['summary'], indent=2)}

## Execution trace (state after each line)
{json.dumps(payload['trace'], indent=2)}

## Student prediction
{json.dumps(payload['prediction'], indent=2)}

## Prediction vs reality
{json.dumps(payload['prediction_check'], indent=2)}

## Known misconceptions
{_misconception_catalogue()}

Respond with ONLY a JSON object:
{{
  "misconception_id": "<one id from the list, or null if the prediction matched>",
  "confidence": <0..1>,
  "diverged_at_step": <step number from the trace, or null>,
  "concept_deltas": {{ "<concept_id>": <0..1 signal, 1=understands 0=gap> }},
  "first_turn": {{
    "intent": "question" | "hint" | "confirm",
    "text": "<one short Socratic question aimed at the misconception>",
    "choices": ["<option>", "..."]   // optional, 2-4 items, for a multiple-choice probe
  }}
}}
"""
