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
├── backend/     FastAPI service: AST parser, sandboxed step executor for the Python code runner
├── frontend/    Next.js (App Router) app: the code editor, trace debugger, chat UI and the Socratic/annotation AI pipeline
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
# (optional) put your GROQ_API_KEY in frontend/.env.local — without it the
# chat assistant runs in MOCK mode with a canned reply. The AI pipeline
# (Groq, model openai/gpt-oss-20b, swappable via frontend/src/lib/ai/) lives
# entirely in the Next.js frontend, not the backend.

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

`npm install` also vendors the Monaco editor into `frontend/public/monaco`
(via `frontend/scripts/copy-monaco.mjs`), so the editor loads from this app
rather than a CDN and works offline. The directory is gitignored — re-run
`npm install` if it goes missing.

---

## Scope for v1 (deliberately small)

Building **one thing well: programming mental-model diagnosis.**

No accounts · no multiplayer · no mobile app · Python only · one small lesson
set. Everything in the UI supports the Predict → Execute → Misconception →
Socratic loop.
