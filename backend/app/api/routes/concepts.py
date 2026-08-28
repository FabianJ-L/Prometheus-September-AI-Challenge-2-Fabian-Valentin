from fastapi import APIRouter

from app import store
from app.core.student_model import recommend_next
from app.data.concepts import CONCEPTS
from app.models.schemas import ConceptNode, ConceptState

router = APIRouter()


@router.get("", response_model=list[ConceptNode])
def list_concepts() -> list[ConceptNode]:
    return CONCEPTS


@router.get("/state", response_model=list[ConceptState])
def concept_state() -> list[ConceptState]:
    """Current mastery estimates for the anonymous learner."""
    return list(store.concept_states.values())


@router.get("/recommended")
def recommended() -> dict:
    return {"concept_id": recommend_next(store.concept_states)}
