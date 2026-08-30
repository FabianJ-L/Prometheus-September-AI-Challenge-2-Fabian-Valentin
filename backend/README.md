# NOESIS — backend

FastAPI execution sandbox: runs and traces the student's Python code, line by
line. That's the only thing this service does — it needs a real Python
process for that (`sys.settrace` over the student's actual code), unlike the
Socratic chat/AI layer, which lives entirely in `frontend/` (see
`frontend/src/lib/ai/` and `frontend/src/app/api/chat/route.ts`) since it's
just an Anthropic API call with no Python dependency.

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
| `app/core/executor.py` | Sandboxed **step-by-step** tracer → execution trace |
| `app/models/schemas.py` | Shared Pydantic models (`ProjectFile`/`TraceStep`/`ExecutionTrace` mirrored in `frontend/src/lib/types.ts`) |

## Test

```bash
uv run pytest
```
