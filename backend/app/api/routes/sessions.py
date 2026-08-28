from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app import loop, store
from app.models.schemas import SessionState

router = APIRouter()


class StartSessionBody(BaseModel):
    lesson_id: str


class PredictionBody(BaseModel):
    answer: object
    rationale: str | None = None


class AnswerBody(BaseModel):
    text: str


def _guard(fn, *args):
    try:
        return fn(*args)
    except loop.LoopError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("", response_model=SessionState)
def start(body: StartSessionBody) -> SessionState:
    return _guard(loop.start_session, body.lesson_id)


@router.get("", response_model=list[SessionState])
def index() -> list[SessionState]:
    return store.list_sessions()


@router.get("/{session_id}", response_model=SessionState)
def read(session_id: str) -> SessionState:
    session = store.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"No session '{session_id}'")
    return session


@router.post("/{session_id}/prediction", response_model=SessionState)
def predict(session_id: str, body: PredictionBody) -> SessionState:
    return _guard(loop.submit_prediction, session_id, body.answer, body.rationale)


@router.post("/{session_id}/answer", response_model=SessionState)
def answer(session_id: str, body: AnswerBody) -> SessionState:
    return _guard(loop.submit_answer, session_id, body.text)
