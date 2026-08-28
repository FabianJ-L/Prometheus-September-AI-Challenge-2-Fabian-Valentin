"""AI diagnostic pipeline.

    code → AST → trace → prediction → diff → misconception → strategy → LLM → question

The LLM only ever runs on top of the structured inputs assembled by
`app/core`. It decides *which pedagogical move* to make; it never rewrites the
student's code.
"""

from app.ai.diagnostic import diagnose

__all__ = ["diagnose"]
