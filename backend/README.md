# NOESIS — backend

FastAPI service that runs/traces the student's Python code in a sandbox and
streams the execution trace to the frontend. The Socratic chat assistant and
its annotation tool calls (marks, notes, memory diagrams) live in the Next.js
frontend now — see `frontend/src/lib/ai/*` and
`frontend/src/app/api/ai/chat/route.ts` — this service has no AI dependency.

## Run

```bash
uv sync
cp .env.example .env
uv run uvicorn app.main:app --reload
```

- API docs: http://localhost:8000/docs
- Health:   http://localhost:8000/api/health

## Layout

| Path | Responsibility |
| --- | --- |
| `app/main.py` | App factory, CORS, router + WebSocket wiring |
| `app/config.py` | Settings (`pydantic-settings`, reads `.env`) |
| `app/api/routes/` | REST endpoints: `health`, `run`, plus the `ws` run/trace socket |
| `app/core/parser.py` | Source → AST summary (loops, conditionals, recursion, ...) |
| `app/core/executor.py` | Sandboxed **step-by-step** tracer → execution trace, identity-aware (heap refs) |
| `app/models/schemas.py` | Shared Pydantic models (`Wire` base auto-serialises camelCase; mirrored in `frontend/src/lib/types.ts`) |

## Test

```bash
uv run pytest
```
