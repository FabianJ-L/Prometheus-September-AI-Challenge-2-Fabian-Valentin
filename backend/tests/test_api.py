from fastapi.testclient import TestClient

from app import store
from app.main import app

client = TestClient(app)


def setup_function():
    store.reset()


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_lessons_listed():
    r = client.get("/api/lessons")
    assert r.status_code == 200
    ids = {lesson["id"] for lesson in r.json()}
    assert "loops-accumulate" in ids


def test_full_loop_wrong_then_retry():
    started = client.post("/api/sessions", json={"lesson_id": "loops-accumulate"}).json()
    sid = started["id"]

    predicted = client.post(f"/api/sessions/{sid}/prediction", json={"answer": 6}).json()
    assert predicted["phase"] == "understand"
    assert predicted["diagnostic"]["prediction_check"]["matches"] is False
    assert predicted["trace"]["final_locals"]["total"] == 12
    assert predicted["turns"], "expected an opening Socratic turn"

    answered = client.post(f"/api/sessions/{sid}/answer", json={"text": "= replaces the value"}).json()
    assert answered["phase"] == "retry"

    corrected = client.post(f"/api/sessions/{sid}/prediction", json={"answer": 12}).json()
    assert corrected["phase"] == "done"
    assert corrected["diagnostic"]["prediction_check"]["matches"] is True


def test_concept_state_moves_after_session():
    started = client.post("/api/sessions", json={"lesson_id": "loops-accumulate"}).json()
    client.post(f"/api/sessions/{started['id']}/prediction", json={"answer": 6})
    state = client.get("/api/concepts/state").json()
    assert any(cs["concept_id"] == "loops" for cs in state)
