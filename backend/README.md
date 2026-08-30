# NOESIS — backend

FastAPI service that runs/traces the student's Python code and powers the
Socratic chat assistant, including its annotation tool calls (marks, notes,
memory diagrams placed directly in the editor).

## Run

```bash
uv sync
cp .env.example .env        # optional: add ANTHROPIC_API_KEY
uv run uvicorn app.main:app --reload
```

- API docs: http://localhost:8000/docs
- Health:   http://localhost:8000/api/health

Without an `ANTHROPIC_API_KEY` the AI layer runs in **mock mode**: the chat
says so plainly, and `app/ai/mock.py` derives `measured` annotations straight
from the trace so the editor is still marked up offline.

## Layout

| Path | Responsibility |
| --- | --- |
| `app/main.py` | App factory, CORS, router + WebSocket wiring |
| `app/config.py` | Settings (`pydantic-settings`, reads `.env`) |
| `app/api/routes/` | REST endpoints: `health`, `run`, `chat`, plus the `ws` run/trace/chat socket |
| `app/core/parser.py` | Source → AST summary (loops, conditionals, recursion, ...) |
| `app/core/executor.py` | Sandboxed **step-by-step** tracer → execution trace, identity-aware (heap refs) |
| `app/ai/client.py` | Anthropic client wrapper — the agentic tool-use loop |
| `app/ai/tools.py` | Annotation tool vocabulary + anchor validation |
| `app/ai/prompts.py` | System prompt + context block builder |
| `app/ai/mock.py` | Offline annotations derived from the trace, no API key needed |
| `app/models/schemas.py` | Shared Pydantic models (`Wire` base auto-serialises camelCase; mirrored in `frontend/src/lib/types.ts`) |

## Test

```bash
uv run pytest
```
