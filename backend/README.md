# NOESIS — backend

FastAPI service that powers the Predict → Execute → Diagnose loop.

## Run

```bash
uv sync
cp .env.example .env        # optional: add ANTHROPIC_API_KEY
uv run uvicorn app.main:app --reload
```

- API docs: http://localhost:8000/docs
- Health:   http://localhost:8000/api/health

Without an `ANTHROPIC_API_KEY` the AI layer runs in **mock mode** and returns
canned misconceptions / Socratic questions so the rest of the system still works.

## Layout

| Path | Responsibility |
| --- | --- |
| `app/main.py` | App factory, CORS, router + WebSocket wiring |
| `app/config.py` | Settings (`pydantic-settings`, reads `.env`) |
| `app/api/routes/` | REST endpoints: `health`, `lessons`, `sessions`, plus the `ws` learning-loop socket |
| `app/core/parser.py` | Source → AST summary (concepts touched, variables, loops) |
| `app/core/executor.py` | Sandboxed **step-by-step** tracer → execution trace |
| `app/core/trace.py` | Trace data structures + prediction/reality diffing |
| `app/core/student_model.py` | Concept-mastery updates from session evidence |
| `app/ai/` | Anthropic client wrapper, prompts, misconception taxonomy, diagnostic pipeline |
| `app/data/` | Seed concept graph + lesson set |
| `app/models/schemas.py` | Shared Pydantic models (mirrored in `frontend/src/lib/types.ts`) |

## Test

```bash
uv run pytest
```
