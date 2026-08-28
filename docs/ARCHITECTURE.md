# NOESIS — architecture

## One sentence

An interactive learning environment that diagnoses a beginner's **programming
mental model** by making them predict execution, running it step by step,
diffing prediction against reality, and teaching the gap with Socratic
questions — never by rewriting their code.

## The loop

```
CODE → PREDICT → EXECUTE → COMPARE → UNDERSTAND → RETRY
```

## Runtime

```
        Next.js (App Router)  ──HTTP──▶  FastAPI  /api
              │                            │
              └──────WebSocket────────────▶│  /api/ws/session   (step streaming)
                                           │
              ┌────────────────────────────┼────────────────────────────┐
              ▼                            ▼                            ▼
        core.parser                  core.executor                core.student_model
         (AST summary)             (settrace step tracer)        (concept mastery EMA)
              │                            │                            │
              └──────────────┬─────────────┘                            │
                             ▼                                          │
                     core.trace.check_prediction                        │
                             │                                          │
                             ▼                                          │
                     ai.diagnostic.diagnose ───▶ ai.client (Anthropic)  │
                             │        (mock fallback when no API key)    │
                             ▼                                          │
                   DiagnosticResult { misconception, concept_deltas,    │
                                      first_turn (Socratic) } ──────────┘
```

## The AI pipeline (what makes this not-a-copilot)

```
code
 └▶ AST summary            (core/parser.py)          deterministic
 └▶ execution trace        (core/executor.py)        deterministic
 └▶ student prediction     (from the UI)
 └▶ prediction/reality diff (core/trace.py)          deterministic
      └▶ misconception classifier   (ai/diagnostic.py + ai/misconceptions.py)
           └▶ student model update  (core/student_model.py)
                └▶ pedagogical strategy → LLM        (ai/prompts.py + ai/client.py)
                     └▶ Socratic question / hint     (never a code rewrite)
```

The LLM only ever sees the **structured bundle**. Its job is to choose the next
teaching move. If there is no API key, `ai/diagnostic.py` uses a deterministic
heuristic keyed on the seed lessons, so the demo runs offline.

## Data model

Source of truth: `backend/app/models/schemas.py`. Mirrored for the frontend in
`frontend/src/lib/types.ts` — **change both together**.

Key types: `Lesson`, `Prediction`, `TraceStep` / `ExecutionTrace`,
`PredictionCheck`, `Misconception`, `SocraticTurn`, `DiagnosticResult`,
`ConceptNode` / `ConceptState`, `SessionState`.

## Deliberately out of scope for v1

Accounts · multiplayer · social · mobile · voice · RAG · a large course catalog ·
gamification · multiple languages. **Python only. One small lesson set.**

## Known shortcuts (hackathon)

| Area | Shortcut | Real version |
| --- | --- | --- |
| Code sandbox | `sys.settrace` + reduced builtins + step/time cap, in-process | subprocess isolate / container / Pyodide (WASM) |
| Persistence | in-memory `app/store.py`, single anonymous learner | SQLite → Postgres |
| Student model | exponential moving average per concept | Bayesian Knowledge Tracing / IRT |
| Dialogue | one Socratic turn + canned follow-up | full multi-turn via `ai/` |
| Misconception classifier | LLM JSON reply, heuristic fallback | fine-tuned classifier + eval set |

## Settings surface (planned)

General · Appearance · Learning (teaching style, difficulty adaptation,
prediction mode, when to show misconceptions) · AI Teacher (never give the
solution, ask before explaining, max hint level: Concept → Strategy → Steps) ·
Code (Python only for now; sandbox mode; show memory / call stack / timeline) ·
Privacy (execution isolation note; clear learning data).
