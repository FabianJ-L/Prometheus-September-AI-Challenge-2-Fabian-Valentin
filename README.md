# NOESIS

### See where your thinking breaks.

An AI programming teacher that doesn't fix your code — it identifies gaps in
your mental model and teaches you through **prediction, execution and guided
questions**.

```
CODE → PREDICT → EXECUTE → COMPARE → UNDERSTAND → RETRY
```

NOESIS watches not only the code, but what the student *predicted*, where the
prediction diverged from real execution, and which misconceptions keep coming
back — building a per-student **mental model** of what they actually understand.

> The LLM isn't the product. The student model is.

---

## Repository layout

```
.
├── backend/     FastAPI service: AST parser, step executor, student model, AI diagnostic
├── frontend/    Next.js (App Router) app: the Predict → Execute → Diagnose loop UI
├── docs/        Architecture, data model, demo script
├── .env.example Shared local env template
└── Makefile     Dev convenience targets
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full picture and
[docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) for the 120-second demo.

---

## Quick start

Prerequisites: **Node 20+**, **Python 3.11+**, and [`uv`](https://docs.astral.sh/uv/).

```bash
# 1. Env
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# (optional) put your ANTHROPIC_API_KEY in backend/.env — without it the
# backend runs in MOCK mode with canned diagnostics.

# 2. Backend  →  http://localhost:8000  (docs at /docs)
cd backend
uv sync
uv run uvicorn app.main:app --reload

# 3. Frontend  →  http://localhost:3000
cd frontend
npm install
npm run dev
```

Or from the repo root: `make setup` then `make dev`.

---

## Scope for v1 (deliberately small)

Building **one thing well: programming mental-model diagnosis.**

No accounts · no multiplayer · no mobile app · Python only · one small lesson
set. Everything in the UI supports the Predict → Execute → Misconception →
Socratic loop.
