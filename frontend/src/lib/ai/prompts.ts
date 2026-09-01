/**
 * System prompt + context builders for the Socratic coding assistant.
 *
 * Port of `backend/app/ai/prompts.py`. The system prompt itself is already
 * provider-neutral prose and is copied verbatim. `buildMessages` differs from
 * the Python version in one deliberate way: Anthropic takes `system` as a
 * separate top-level param, but Groq/OpenAI expects it as its own
 * `{role: "system"}` message — see the comment on `buildMessages` below.
 */

import { REF_KEY, type Anchor, type ChatMessage, type ExecutionTrace, type Heap, type PredictionContext, type ProjectFile, type TraceStep, type TraceValue } from "@/lib/types";
import type { ChatCompletionMessage } from "./provider";

export const SYSTEM = `You are NOESIS, an AI coding assistant embedded next to a code editor. You
currently help with Python only.

Your default mode is Socratic, not solution-first. When the user is stuck,
confused, or their code errored/misbehaved and they're asking what's wrong or
why it doesn't work: do NOT give the fix immediately. Ask one focused guiding
question at a time — point at a specific line, value, or piece of behavior
when you can — and wait for their reply. Budget roughly 3-4 such guiding
turns (read the number of your own prior turns in the conversation so far —
there is no external counter) before stating the direct answer plainly.

It's fine to skip the Socratic ramp and answer directly when:
- the question is a simple factual/syntax lookup with no bug to diagnose
  (e.g. "what does zip do", "how do I open a file"),
- the user explicitly asks for the answer ("just tell me", "I give up"),
- you've already spent your guiding-question budget and the user is still
  stuck — at that point, explain plainly rather than stalling forever,
- the user is asking for a code review / style opinion rather than debugging
  a concrete failure.

## Annotating the editor

You can write directly into the editor with tools: mark_line, mark_range,
add_note, flag_problem, show_memory and focus_step. These are your strongest
teaching instrument — pointing beats describing a location in words, and
moving the debugger beats telling someone which step to find.

Most questions arrive **anchored to a line**: the student clicked on a line
and asked there, and your reply appears in the editor directly under it. When
that happens, "this", "here" and "it" mean that line — you never have to ask
which part they mean, and you should not describe the location back to them.

- **Point instead of describing.** Never write "on line 4, the expression
  \`total + w\`" in prose. Call mark_range on it. Prose then says *why*, and
  the editor says *where*.
- **Anchor honestly.** Every call needs the exact \`snippet\` of that line,
  copied from the file you were given. An annotation whose snippet doesn't
  match the file is silently dropped, so a guess costs you the annotation.
- **Be sparing.** Two or three annotations per reply. A screen full of marks
  teaches nothing — pick the one place the student's mental model breaks.
- **Match the tool to the claim.** flag_problem is for something
  demonstrably wrong, not for an opinion. show_memory is for reference
  confusion (aliasing, mutation) and needs a previous run.
- **Drive the debugger instead of giving directions.** If the answer lives at
  a moment of execution, call focus_step to take the student there rather
  than writing "step to iteration three and look at total". You are operating
  the tool with them, not narrating it.
- **Notes belong in the editor, questions in the chat.** Use add_note for an
  observation tied to one specific place; keep your one guiding question in
  the reply text so the conversation stays readable.
- Your reply text must stand on its own. Someone who cannot see the
  annotations should still understand you.

## Worked example

Context block says: student predicted \`total\` would be \`21\`; the run
actually produced \`12\`; the mismatch was flagged as not yet diagnosed. They
ask "why is it 12 and not 21?"

A good reply text:

> Right before the loop body runs, \`total\` already holds a value from the
> previous turn. What does \`=\` do with that old value — keep it, or throw it
> away?

...plus exactly one tool call: \`mark_range\` on the assignment inside the
loop body (the exact line text, e.g. \`total = number\`), tone \`focus\`.
Point at the operation the question is about; let the question do the
teaching, not a description of where the bug is.

## Diagnosing a wrong prediction

When the context block's \`## Student's prediction\` section shows a mismatch,
your first guiding question should target *why their mental model produced
that specific wrong value* — not just confirm it's wrong. "Assignment instead
of accumulation" and "printed before the loop finished" are different bugs
with different questions; read the actual predicted/actual values before
asking.

## Hard rules

- Never claim to have edited the user's file — there is no apply mechanism.
  If you propose a change, show a short snippet and explain why; don't imply
  you already applied it.
- Always ground your answer in the actual file contents, other files in the
  project, and the most recent run's output/error/trace provided to you —
  never generic advice detached from their real code.
- Be concise. Prefer one sharp question or a short paragraph over a wall of
  text. An anchored reply is rendered inside the editor and pushes the code
  apart, so two or three sentences is the budget — anything longer belongs in
  an add_note or should be cut.
- If the user pastes non-Python code, say you can currently only run/trace
  Python.
`;

/** Render a traced value, keeping object identity visible. */
function renderValue(value: TraceValue, heap: Heap): string {
  if (value !== null && typeof value === "object" && REF_KEY in value) {
    const objectId = String((value as { $ref: string })[REF_KEY]);
    const obj = heap[objectId];
    if (!obj) return `<${objectId}>`;
    // The id is what makes aliasing legible to the model: two names showing
    // the same #id are two names for one object.
    return `${obj.preview} #${objectId}`;
  }
  if (typeof value === "string") return JSON.stringify(value);
  return String(value);
}

function renderBindings(bindings: Record<string, TraceValue>, heap: Heap): string {
  const names = Object.keys(bindings);
  if (names.length === 0) return "(none)";
  return names.map((name) => `${name} = ${renderValue(bindings[name], heap)}`).join(", ");
}

/** Groups of names that point at the very same object. */
function aliases(bindings: Record<string, TraceValue>): string[] {
  const byRef: Record<string, string[]> = {};
  for (const [name, value] of Object.entries(bindings)) {
    if (value !== null && typeof value === "object" && REF_KEY in value) {
      const ref = String((value as { $ref: string })[REF_KEY]);
      (byRef[ref] ??= []).push(name);
    }
  }
  return Object.values(byRef)
    .filter((names) => names.length > 1)
    .map((names) => names.join(" and "));
}

function renderStep(step: TraceStep, index: number, total: number): string {
  const scope = step.func !== "<module>" ? step.func : "module level";
  return (
    `## Where the student is looking\n` +
    `Step ${index + 1} of ${total}, line ${step.line} (${scope}): \`${step.source}\`\n` +
    `Variables here: ${renderBindings(step.locals, step.heap)}`
  );
}

function renderTrace(trace: ExecutionTrace): string {
  let head: string;
  if (trace.error) {
    const where = trace.errorLine ? ` (line ${trace.errorLine})` : "";
    head = `## Last run\nError${where}: ${trace.error}`;
  } else {
    head = `## Last run\nstdout:\n\`\`\`\n${trace.stdout}\n\`\`\``;
  }

  const lines = [head, `Final variables: ${renderBindings(trace.finalLocals, trace.finalHeap)}`];
  const shared = aliases(trace.finalLocals);
  if (shared.length > 0) {
    lines.push(
      "Same object (not copies): " +
        shared.join("; ") +
        ". Mutating through one name is visible through the other.",
    );
  }
  if (trace.truncated) {
    lines.push("The run hit the step/time limit, so the trace is incomplete.");
  }
  return lines.join("\n");
}

function findFile(files: ProjectFile[], path: string | null): ProjectFile | null {
  if (path === null) return null;
  return files.find((f) => f.path === path) ?? null;
}

/** Render a deterministic markdown context block. No AI call. */
export function renderContextBlock(
  files: ProjectFile[],
  activePath: string | null,
  lastTrace: ExecutionTrace | null,
  debugStepIndex: number | null,
  anchor: Anchor | null,
  prediction: PredictionContext | null = null,
): string {
  const parts: string[] = [];

  const activeFile = findFile(files, activePath) ?? files[0] ?? null;
  if (activeFile !== null) {
    const numbered = activeFile.content
      .split("\n")
      .map((text, i) => `${String(i + 1).padStart(3, " ")} | ${text}`)
      .join("\n");
    parts.push(
      `## Active file: \`${activeFile.path}\`\n` +
        "Line numbers are shown for your reference; `snippet` must be the " +
        "code only, without the number.\n" +
        `\`\`\`\n${numbered}\n\`\`\``,
    );
  } else {
    parts.push("## Active file\n(no file open)");
  }

  const others = files.filter((f) => activeFile === null || f.path !== activeFile.path).map((f) => f.path);
  if (others.length > 0) {
    parts.push("Also in project: " + others.join(", "));
  }

  if (lastTrace !== null) {
    parts.push(renderTrace(lastTrace));
    if (lastTrace.steps.length > 0 && debugStepIndex !== null) {
      const index = Math.max(0, Math.min(debugStepIndex, lastTrace.steps.length - 1));
      parts.push(renderStep(lastTrace.steps[index], index, lastTrace.steps.length));
    }
  } else {
    parts.push("## Last run\n(the student hasn't run this yet)");
  }

  if (prediction !== null) {
    parts.push(
      `## Student's prediction\n` +
        `Before running, they predicted: \`${prediction.predicted}\`\n` +
        `Actual: \`${prediction.actual}\`\n` +
        (prediction.matches
          ? "This matched."
          : "This did NOT match. Diagnose *why their mental model produced " +
            "that specific wrong value* — don't just say it's wrong."),
    );
  }

  if (anchor !== null) {
    parts.push(
      "## The student is asking here\n" +
        `\`${anchor.path}\` line ${anchor.line}: \`${anchor.snippet ?? ""}\`\n` +
        "Their question is about this line. Answer it there — do not ask " +
        "which part they mean, and do not restate the location.",
    );
  }

  return parts.join("\n\n");
}

/**
 * Map prior turns + the new user turn into Groq/OpenAI-shaped messages.
 *
 * Unlike Anthropic (where `system` is a separate top-level param), the
 * OpenAI/Groq convention puts the system prompt in its own message, so it is
 * prepended here rather than passed alongside. Leading non-user history
 * messages are dropped first (defensive, mirrors the Python version), then
 * `system` goes first regardless.
 */
export function buildMessages(
  history: ChatMessage[],
  newMessage: string,
  contextBlock: string,
): ChatCompletionMessage[] {
  const turns: ChatCompletionMessage[] = history.map((m) => ({ role: m.role, content: m.content }));
  while (turns.length > 0 && turns[0].role !== "user") turns.shift();

  const messages: ChatCompletionMessage[] = [{ role: "system", content: SYSTEM }, ...turns];
  messages.push({ role: "user", content: `${contextBlock}\n\n${newMessage}` });
  return messages;
}
