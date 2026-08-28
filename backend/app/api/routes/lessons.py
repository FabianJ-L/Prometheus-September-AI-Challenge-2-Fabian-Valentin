from fastapi import APIRouter, HTTPException

from app.data.lessons import LESSONS, get_lesson
from app.models.schemas import Lesson

router = APIRouter()


@router.get("", response_model=list[Lesson])
def list_lessons() -> list[Lesson]:
    return sorted(LESSONS, key=lambda lesson: lesson.order)


@router.get("/{lesson_id}", response_model=Lesson)
def read_lesson(lesson_id: str) -> Lesson:
    lesson = get_lesson(lesson_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail=f"No lesson '{lesson_id}'")
    return lesson
