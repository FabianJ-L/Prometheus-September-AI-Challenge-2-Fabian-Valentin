# NOESIS — AI integration strategy

This document reasons through how to make the AI pipeline more capable and
more integrated, without losing what makes NOESIS not-a-copilot. It covers
file/context handling, chat visual design, inline-AI surface area, prompt
architecture, the AI's behavioral scope, and a prioritized feature roadmap.

Everything here is a **proposal**, not a description of shipped behavior —
see `docs/ARCHITECTURE.md` for what's actually built today. Where a v1
guardrail (Python-only, no accounts, no server-side persistence) would be
crossed, the item is explicitly marked **[v2]**.

## 0. Where this starts from

The AI pipeline today is: one `/api/ai/chat` route, one non-streaming
request per turn, a single well-written but rules-only system prompt, a
context block that shows the full active file and the *names* of other
files, and exactly one way to trigger the assistant (gutter "?" / ⌘I). The
product's stated thesis — *"the LLM isn't the product, the student model
is,"* built around a `CODE → PREDICT → EXECUTE → COMPARE → UNDERSTAND →
RETRY` loop — is only partially real: the PREDICT step, the misconception
naming, and the student model in `docs/DEMO_SCRIPT.md` do not exist in the
app; `docs/ARCHITECTURE.md`'s "Known shortcuts" table says so plainly. That
gap is the single biggest lever available, and it shapes the priorities
below more than any UI polish does.

## 1. Chat ↔ files: the context model

The current model — full content of the active file, bare paths for
everything else, no retrieval — is a reasonable v1 default for one-file
lessons, but it means the assistant is blind to a second file the moment a
bug spans two of them (e.g. a helper imported from `utils.py`). The fix is
not RAG — these are few-file student projects, not a corpus that needs
semantic search — it's plain **on-demand tool use**:

- **`read_file(path)` tool**, defined in `frontend/src/lib/ai/tools.ts`
  next to the existing annotation tools (`mark_line`, `mark_range`, …).
  Default context stays small (active file + trace); the model reaches for
  another file only when it actually needs to reason about it. Same
  validation posture as the rest of the tool layer: unknown path → a
  synthetic `tool`-role error message so the model can recover within the
  turn, mirroring how `resolveAnchor()` already handles a bad annotation
  snippet (`frontend/src/lib/ai/tools.ts:172-206`, `route.ts:69-104`).
- **Project map instead of a bare path list.** Replace `"Also in project:
  a.py, b.py"` with one line per file summarizing its top-level
  functions/classes, sourced from the AST already produced by
  `backend/app/core/parser.py`. Zero extra LLM cost, deterministic, and it
  turns "there's another file" into "there's a `validate()` function over
  there" — enough for the model to decide whether `read_file` is worth
  calling.
- **Attribution in the UI.** When a reply used `read_file`, show a small
  chip on the `ThreadCard` naming the file it pulled in — so a student
  can tell the answer drew on code they haven't looked at, the same way
  `source: "ai"` vs `"measured"` is never blurred for annotations
  (`docs/ARCHITECTURE.md:92-100`).
- **[v2]** Real project-wide search/summarization if NOESIS ever grows
  past single-lesson, few-file projects. Not worth building against the
  "one small lesson set" scope today.

## 2. Chat visual design

`docs/ARCHITECTURE.md` already names the right metaphor and the UI doesn't
fully commit to it yet: *"closer to a review comment than to a chat log."*
Lean into that on purpose instead of drifting toward generic chat-bubble
styling:

- **Review-comment layout, not alternating bubbles.** One avatar/name at
  the top of a `ThreadCard`, a left accent bar in NOESIS's color, compact
  prose, collapsible to the gutter dot — no left/right message alternation,
  which implies a peer conversation this isn't.
- **Reuse the existing color contract.** The annotation system already
  distinguishes `measured` (green, can't be wrong) from `ai` (accent,
  attributed) — carry that exact split into chat styling instead of
  inventing a second palette. A student should be able to tell "this came
  from the trace" vs "this is the model's read" at a glance, everywhere.
- **Theme-matched code blocks.** Route fenced code in replies through the
  same tokenizer Monaco uses instead of generic Markdown `<pre>` styling,
  so a snippet in the chat and the code in the editor look like the same
  language.
- **Prose ↔ annotation cross-links.** When a reply's text refers to
  something it also called `mark_range` on, make that span in the prose
  clickable — clicking briefly flashes the corresponding decoration in the
  editor. Closes the loop between "the editor says where, prose says why"
  (`prompts.ts:46-48`) that today only works one direction.
- **Better pending/empty states.** Replace the plain "denkt nach" text
  with a skeleton/pulse in the shape of the reply that's coming; give the
  empty `AskComposer` a one-line placeholder ("Was ist an dieser Zeile
  unklar?") instead of a blank box.
- **`ThreadList.tsx` as a real index, not just a toggle rail.** Show a
  one-line preview of the last message plus a file/line badge per thread,
  grouped by file — right now it's a collapsed list with little
  information scent.
- **Primary files:** `frontend/src/components/workspace/ThreadCard.tsx`,
  `frontend/src/components/ui/Markdown.tsx`, `ThreadList.tsx`.

## 3. Inline-AI interactions

Today there is exactly one entry point: hover a line for the gutter "?", or
⌘I on the caret line. That's a clean, deliberate design (anchoring is what
makes the whole thread model work), but it's also the single biggest
discoverability gap — there's no reason the *idea* of an anchored ask
should be limited to one trigger. All of the below still funnel into the
same `WorkspaceService.ask()` / anchored-`Thread` model; they're additional
doors into the same room, not a new interaction paradigm:

- **CodeLens above definitions** (Monaco's `registerCodeLensProvider`):
  "Explain this function" / "Quiz me on this" above each `def`/`class` —
  fires `ask()` with a canned prompt instead of free text.
- **Selection toolbar**, the same idea as Monaco's built-in quick-fix
  lightbulb: selecting a range surfaces 1-2 contextual actions ("Erklär
  das", "Was passiert hier beim Ausführen?") anchored to the selection
  instead of a single line.
- **Proactive error nudge.** When a run fails, the `measured` annotation
  already lands on the error line (`lib/ai/mock.ts`, trace-driven) — give
  it a small "Frag NOESIS" chip right there, so the assistant is offered
  at the moment it's most useful instead of requiring the student to
  remember ⌘I exists.
- **"?" on inline debug values.** While scrubbing the trace timeline,
  values are already rendered via content widgets (`EditorInline.tsx`).
  Add a tiny affordance there that anchors a question to *that variable at
  that step* — no need to type "what is `total` here", the anchor already
  says it.
- **Command palette entry** (F1: "NOESIS: Ask about this line") for
  keyboard-first discoverability beyond the gutter.
- **Primary files:** `frontend/src/components/workspace/Editor.tsx`,
  `EditorInline.tsx`, `EditorZone.tsx`.

## 4. Prompt architecture

The system prompt (`frontend/src/lib/ai/prompts.ts:14-81`) is well-scoped
prose but entirely rules-based — no worked example. That matters more than
usual here because the model behind it is a small one (Groq
`openai/gpt-oss-20b`), which benefits disproportionately from seeing the
shape of a good turn rather than being told the shape in the abstract.

- **Add one concrete few-shot exchange** to `SYSTEM`: a short anchored
  question, one guiding question in reply, one `mark_range` call — makes
  "point instead of describing" and "be sparing" concrete instead of
  aspirational.
- **Extend the context block for prediction** (once §6.1 exists): a new
  `## Student's prediction` section in `renderContextBlock()`
  (`prompts.ts:156-206`) carrying what the student predicted vs what the
  trace actually produced, plus an explicit system-prompt rule for how to
  react — a wrong prediction should be diagnosed for *why the model in
  their head produced that answer*, not just marked incorrect.
- **Recovery message for `read_file` failures**, same pattern as the
  existing anchor-mismatch recovery: a synthetic `tool` message telling
  the model what went wrong so it can retry within the turn instead of
  hallucinating file content.
- **Streaming is an engineering change, not a prompt change** — prose
  streams token-by-token, tool calls still resolve at the end of a turn
  (standard OpenAI-compatible tool+streaming shape). Touches `route.ts`,
  `provider.ts`, `groq.ts`, not `prompts.ts`.
- **Leave the hard rules alone.** "Never claim to have edited the file",
  "ground answers in the real file/trace", "Python only" are load-bearing
  for trust and should survive every change below unmodified.

## 5. What the AI should actually do

The identity stays fixed: Socratic by default, never auto-fixes code,
points via annotations rather than describing location in prose,
diagnoses *reasoning* gaps rather than syntax errors. Two behavioral
additions are worth designing for now, both consistent with that identity:

- **Prediction-diagnosis mode** — see §6.1, this is the core of it.
- **Session-scoped insight instead of a backend student model.** A new
  optional tool call, `tag_concept(concept, confidence)`, that the model
  emits alongside a normal reply when a turn clearly exercised a specific
  concept (aliasing, mutation, scope, …). The client accumulates these in
  memory/`localStorage` for the session only — no account, no server
  persistence — and surfaces a small end-of-session summary: *"Came up
  repeatedly today: references vs. copies (3×)."* This is a deliberately
  small version of the "the student model is the product" promise that
  fits inside v1's guardrails exactly, rather than the full persisted
  Bayesian-tracing vision from the old architecture draft.
- **Suggestions get their own visual lane.** The hard rule "never claim to
  have applied a change" is correct and should stay — but a proposed
  rewrite today is just a prose code fence, easy to misread as already
  applied. Give it a distinct, explicitly labeled "suggestion, not
  applied" block so the constraint is reinforced by the UI, not only by
  the model's wording.

## 6. Feature roadmap — what would actually win someone over

Ranked by impact against NOESIS's specific thesis (not generic
copilot-feature value), with a rough effort read.

| # | Feature | Why it matters here | Effort |
| --- | --- | --- | --- |
| 1 | **Predict-before-run UI** | This *is* the product's stated loop (`README.md`'s `PREDICT` step, the whole spine of `docs/DEMO_SCRIPT.md`) and it's the largest gap between vision and shipped code today (`docs/ARCHITECTURE.md:145`). Nothing else on this list matters as much to the pitch. | High — new UI (predict input, compare view), new context-block section, prompt tuning (§4) |
| 2 | **Session misconception/insight panel** | Makes "the student model is the product" visible without needing accounts or a backend — directly demoable. | Medium — one new tool (§5), small client-side aggregation, a summary panel |
| 3 | **Proactive error nudge** | Cheapest way to make the assistant feel integrated rather than something you must remember to invoke. | Low — one chip on an existing annotation |
| 4 | **Streaming replies** | Replaces "denkt nach" + block-dump with the assistant visibly typing — a pure but real "feels alive" upgrade. | Medium — `route.ts` + `provider.ts` + incremental `ThreadCard` render |
| 5 | **CodeLens + selection toolbar** | More entry points to the same anchored-thread model, cheap via Monaco's existing provider APIs. | Low–Medium |

**[v2] — later, explicitly out of scope for the next pass:** true
project-wide search/summarization for larger codebases, multi-language
support, a real cross-session persisted student model (accounts +
storage), and streamed annotations that arrive progressively instead of
only after the tool-call loop finishes.

## Sequencing note

§6 items are independent enough to land in any order, but #1 (prediction)
touches the context block and system prompt that #2 and later streaming
work also touch — doing it first avoids rebasing prompt changes twice.
§2 (chat visuals) and §3 (inline entry points) are UI-only and can proceed
in parallel with any of the above.
