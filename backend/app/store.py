"""In-memory state.

v1 has no accounts and no database. Sessions and the single anonymous student's
concept states live in process memory and reset on restart. Swap for SQLite /
Postgres behind this interface when persistence is needed.
"""

from __future__ import annotations

import uuid

from app.models.schemas import ConceptState, SessionState

# One anonymous learner for the demo.
concept_states: dict[str, ConceptState] = {}

_sessions: dict[str, SessionState] = {}


def new_session_id() -> str:
    return uuid.uuid4().hex[:12]


def save_session(session: SessionState) -> SessionState:
    _sessions[session.id] = session
    return session


def get_session(session_id: str) -> SessionState | None:
    return _sessions.get(session_id)


def list_sessions() -> list[SessionState]:
    return sorted(_sessions.values(), key=lambda s: s.started_at, reverse=True)


def reset() -> None:
    _sessions.clear()
    concept_states.clear()
