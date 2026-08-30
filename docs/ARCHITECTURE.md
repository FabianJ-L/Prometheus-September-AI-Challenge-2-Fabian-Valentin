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

> The diagram below is **what is built today**. An earlier draft of this file
> described a larger pipeline (`ai/diagnostic.py`, `core/student_model.py`,
> `app/store.py`, a misconception classifier, a persisted student model). Those
> files do not exist yet — the vision is still the vision, but this section now
> describes the code.

```
code + last run
 └▶ execution trace         (core/executor.py)   deterministic, identity-aware
 └▶ context block           (ai/prompts.py)      numbered source + trace + aliases
      └▶ Claude, with annotation tools  (ai/client.py + ai/tools.py)
           ├▶ tool calls  → validated against the real file → annotations
           └▶ reply text  → the Socratic question
```

The model has **two output channels**. Prose goes to the chat; annotations go
onto the code itself. Tool use rather than markup in the reply means a
malformed annotation cannot half-render, and every call is checked before the
UI sees it.

### Where the conversation lives

The assistant is not reachable through a chat pane. Questions are asked **in
the editor, at a line**: the gutter offers a "?" on the line under the pointer
(or ⌘I on the caret's line), and the reply opens in a view zone directly under
that line.

That is not a cosmetic move. An anchored question carries its own subject —
`ChatRequest.anchor` — so neither side has to describe where "this" is, and the
answer can be rendered at the code it concerns. A `Thread` is therefore a
conversation pinned to a place, closer to a review comment than to a chat log.
The panel on the right is an *index* of those threads, collapsed to a rail by
default; a pane that is always open quietly makes itself the main way in.

`focus_step` is the other half of the same idea: rather than telling a student
which step to find, the assistant moves their debugger there. It is validated
against the run that actually happened — a step number outside the trace is
refused, because a debugger that jumps somewhere arbitrary is worse than one
that stays put.

### Annotations

An annotation carries a `source` that the UI never blurs:

| `source` | Comes from | Can it be wrong? | Rendered as |
| --- | --- | --- | --- |
| `measured` | the execution trace | no | green gutter dot, plain statements |
| `ai` | the assistant | yes | accent gutter dot, attributed "NOESIS meint" |

A student who cannot tell those apart has no way to know which one to check,
so the split is enforced in the data model, not left to the copy.

**Anchoring.** Every annotation carries `{line, snippet}` — the line number
*and* the text expected on it. Line numbers alone are the most common way an
LLM points at the wrong code. The backend rejects an annotation whose snippet
matches nothing (`ai/tools.py`), relocates it when exactly one other line
matches, and tells the model which happened so it can re-anchor inside the same
turn. The frontend re-runs the same resolution on every keystroke
(`lib/annotations.ts`); when the code moves out from under an annotation it is
shown as *stale* rather than silently re-pointed.

**Rendering** (`components/workspace/Editor.tsx`) uses three Monaco mechanisms:

| Need | Mechanism |
| --- | --- |
| marks on the text, gutter glyphs | decorations |
| squiggle + hover message | model markers |
| blocks between lines (notes, memory diagrams) | view zones |
| trailing labels and inline values | content widgets |

Decoration injected text (`after`) would be the natural fit for the last row
and renders nothing in the bundled Monaco 0.56 — a control decoration with a
plain `className` paints, the same decoration with `after` produces no DOM node
at all. Content widgets anchored past the last column are the working
equivalent.

**Without an API key** the assistant says so plainly and `ai/mock.py` derives
`measured` annotations from the trace instead — the error line, or the aliasing
case with a memory diagram. The demo still shows a marked-up editor offline; it
just never puts invented insight in the model's voice.

## Deliberately out of scope for v1

Accounts · multiplayer · social · mobile · voice · RAG · a large course catalog ·
gamification · multiple languages. **Python only. One small lesson set.**

## Known shortcuts (hackathon)

| Area | Shortcut | Real version |
| --- | --- | --- |
| Code sandbox | `sys.settrace` + reduced builtins + step/time cap, in-process | subprocess isolate / container / Pyodide (WASM) |
| Persistence | in-memory `app/store.py`, single anonymous learner | SQLite → Postgres |
| Student model | exponential moving average per concept | Bayesian Knowledge Tracing / IRT |
| Dialogue | multi-turn threads, no token streaming | streamed text + streamed annotations |
| Prediction step | not built — the README's PREDICT stage has no UI yet | predict-before-run, compared against the trace |
| Misconception classifier | not built; the model reasons from the trace | fine-tuned classifier + eval set |
| Student model | not built | per-concept mastery across sessions |
| Annotation lifetime | cleared on each new question or run | reviewable history |

## Settings surface (planned)

General · Appearance · Learning (teaching style, difficulty adaptation,
prediction mode, when to show misconceptions) · AI Teacher (never give the
solution, ask before explaining, max hint level: Concept → Strategy → Steps) ·
Code (Python only for now; sandbox mode; show memory / call stack / timeline) ·
Privacy (execution isolation note; clear learning data).
