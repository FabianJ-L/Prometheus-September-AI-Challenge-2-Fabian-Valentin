from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_run_endpoint():
    body = {
        "files": [{"path": "main.py", "content": "print(1 + 1)"}],
        "entry_path": "main.py",
    }
    r = client.post("/api/run", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["error"] is None
    assert data["stdout"].strip() == "2"


def test_run_endpoint_missing_entry():
    body = {
        "files": [{"path": "main.py", "content": "print(1)"}],
        "entry_path": "missing.py",
    }
    r = client.post("/api/run", json=body)
    assert r.status_code == 400
