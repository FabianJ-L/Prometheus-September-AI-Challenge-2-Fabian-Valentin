/**
 * The annotation vocabulary the assistant can use, and its validation.
 *
 * Port of `backend/app/ai/tools.py`. The model gets a second output channel
 * besides prose: tool calls that place marks, notes and diagrams onto
 * specific lines of the user's code. Every call passes through
 * `buildAnnotation` before it ever reaches the UI.
 *
 * Anchoring by snippet, not by column
 * -----------------------------------
 * Every tool anchors with a `line` *and* the `snippet` the model expects to
 * find there. The snippet turns a guess into something checkable: if it does
 * not match, the annotation is relocated or dropped.
 */

import type { Annotation, AnnotationKind, AnnotationTone, Anchor, ProjectFile } from "@/lib/types";
import type { ToolDefinition } from "./provider";

const TONES = ["info", "focus", "success", "warning", "danger"] as const;

const LINE_PROP = { type: "integer", description: "1-based line number in the file." };
const SNIPPET_PROP = {
  type: "string",
  description:
    "The exact source text you expect on that line, copied verbatim from " +
    "the file (leading indentation may be omitted). Used to verify you are " +
    "pointing at the right line; a mismatch drops the annotation.",
};
const PATH_PROP = { type: "string", description: "File path. Omit for the active file." };

function schema(props: Record<string, unknown>, required: string[]): Record<string, unknown> {
  return {
    type: "object",
    properties: { path: PATH_PROP, line: LINE_PROP, snippet: SNIPPET_PROP, ...props },
    required: ["line", "snippet", ...required],
  };
}

function fn(name: string, description: string, parameters: Record<string, unknown>): ToolDefinition {
  return { type: "function", function: { name, description, parameters } };
}

export const TOOLS: ToolDefinition[] = [
  fn(
    "mark_line",
    "Draw the student's eye to one whole line. Use when the line itself " +
      "is the subject — where execution goes wrong, where a value is set " +
      "that they did not expect. Prefer mark_range when a single " +
      "expression on the line is the real subject.",
    schema(
      {
        tone: { type: "string", enum: TONES },
        label: { type: "string", description: "Optional 2-5 word tag shown at the end of the line." },
      },
      ["tone"],
    ),
  ),
  fn(
    "mark_range",
    "Emphasise one expression inside a line — the precise thing you are " +
      "pointing at. This is the sharpest tool you have; reach for it " +
      "instead of describing a location in prose.",
    schema(
      {
        text: {
          type: "string",
          description:
            "The exact substring of that line to emphasise, e.g. " +
            "'total + w'. Must occur in the line verbatim.",
        },
        tone: { type: "string", enum: TONES },
        label: { type: "string", description: "Optional 2-5 word tag shown floating beside it." },
      },
      ["text", "tone"],
    ),
  ),
  fn(
    "add_note",
    "Write a short comment into the editor, between the lines, directly " +
      "under the code it is about. This is where a guiding question " +
      "belongs when it concerns one specific place in the code.",
    schema(
      {
        body: {
          type: "string",
          description:
            "Markdown. Two or three sentences at most — this sits " +
            "inside the editor and pushes the code apart. " +
            "**bold** and `code` are supported.",
        },
      },
      ["body"],
    ),
  ),
  fn(
    "flag_problem",
    "Underline a line the way a compiler error does, with a message on " +
      "hover. Reserve this for something demonstrably wrong — a real " +
      "error or a definite bug — not for a stylistic opinion.",
    schema(
      {
        severity: { type: "string", enum: ["warning", "error"] },
        message: { type: "string", description: "One sentence." },
      },
      ["severity", "message"],
    ),
  ),
  fn(
    "focus_step",
    "Move the student's step debugger to a specific step of the last " +
      "run, so 'look at what happens here' actually takes them there. Use " +
      "it when the answer lives at a particular moment of execution — the " +
      "step where a value first goes wrong, where a loop turns over, where " +
      "the object gets mutated. Step numbers come from the trace you were " +
      "given. Use at most once per reply.",
    {
      type: "object",
      properties: {
        step: { type: "integer", description: "1-based step number from the run, as shown in the trace." },
        because: { type: "string", description: "Short reason, shown to the student. 3-8 words." },
      },
      required: ["step", "because"],
    },
  ),
  fn(
    "show_memory",
    "Open a memory diagram under a line, showing which names point at " +
      "which objects. Use it when the confusion is about references — " +
      "aliasing, mutation, or 'why did changing one change the other'. " +
      "Requires a previous run.",
    schema(
      {
        variables: {
          type: "array",
          items: { type: "string" },
          description: "Variable names to focus on. Empty means all.",
        },
      },
      ["variables"],
    ),
  ),
];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function normalise(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function makeAnchor(path: string, line: number, snippet: string | null, extra: Partial<Anchor> = {}): Anchor {
  return { path, line, endLine: null, column: null, endColumn: null, snippet, ...extra };
}

function makeAnnotation(
  base: Pick<Annotation, "id" | "kind" | "source" | "anchor"> & Partial<Annotation>,
): Annotation {
  return { tone: "neutral", label: null, body: null, variables: [], threadId: null, stale: false, ...base };
}

interface ResolvedAnchor {
  anchor: Anchor;
  lineText: string;
}

/**
 * Turn raw tool input into a verified anchor plus the line's real text.
 * Returns `null` when the anchor cannot be trusted: unknown file, line out of
 * range, or a snippet that matches nothing.
 */
function resolveAnchor(
  files: ProjectFile[],
  activePath: string | null,
  raw: Record<string, unknown>,
): ResolvedAnchor | null {
  const path = (raw.path as string | undefined) || activePath || undefined;
  let target = files.find((f) => f.path === path);
  if (!target) target = files.find((f) => f.path === activePath) ?? files[0];
  if (!target) return null;

  const lines = target.content.split("\n");
  if (lines.length === 0) return null;

  const line = Number(raw.line ?? 0);
  if (!Number.isInteger(line)) return null;

  const snippet = String(raw.snippet ?? "");
  const wanted = normalise(snippet);

  // Trust the line number only when the snippet agrees with it.
  if (line >= 1 && line <= lines.length && (!wanted || normalise(lines[line - 1]) === wanted)) {
    return { anchor: makeAnchor(target.path, line, lines[line - 1].trim()), lineText: lines[line - 1] };
  }

  if (!wanted) return null;

  // The line moved (or was guessed). Relocate — but only on an unambiguous hit.
  const matches: number[] = [];
  lines.forEach((text, i) => {
    if (normalise(text) === wanted) matches.push(i + 1);
  });
  if (matches.length !== 1) return null;
  const found = matches[0];
  return { anchor: makeAnchor(target.path, found, lines[found - 1].trim()), lineText: lines[found - 1] };
}

function tone(value: unknown, fallback: AnnotationTone = "info"): AnnotationTone {
  const valid: AnnotationTone[] = ["neutral", "info", "focus", "success", "warning", "danger"];
  return typeof value === "string" && (valid as string[]).includes(value) ? (value as AnnotationTone) : fallback;
}

function short(value: unknown, limit = 48): string | null {
  if (!value) return null;
  const text = String(value).split(/\s+/).filter(Boolean).join(" ");
  return text.length <= limit ? text : text.slice(0, limit - 1) + "…";
}

/**
 * Validate a `focus_step` call against the run that actually happened.
 * Returns a 0-based index plus the reason, or `null` when there is no such step.
 */
export function readFocusStep(
  raw: Record<string, unknown>,
  totalSteps: number,
): { index: number; because: string } | null {
  if (totalSteps <= 0) return null;
  const step = Number(raw.step ?? 0);
  if (!Number.isInteger(step) || step < 1 || step > totalSteps) return null;
  return { index: step - 1, because: short(raw.because) ?? "" };
}

/** Validate one tool call and turn it into an annotation, or drop it. */
export function buildAnnotation(
  name: string,
  raw: Record<string, unknown>,
  files: ProjectFile[],
  activePath: string | null,
  index: number,
): Annotation | null {
  const resolved = resolveAnchor(files, activePath, raw);
  if (!resolved) return null;
  const { anchor, lineText } = resolved;
  const id = `ai-${index}`;

  if (name === "mark_line") {
    return makeAnnotation({
      id,
      kind: "line" as AnnotationKind,
      source: "ai",
      anchor,
      tone: tone(raw.tone),
      label: short(raw.label),
    });
  }

  if (name === "mark_range") {
    const text = String(raw.text ?? "");
    const column = lineText.indexOf(text);
    if (!text || column < 0) {
      // The span does not exist on that line — fall back to marking the
      // whole line rather than emphasising an arbitrary stretch of text.
      return makeAnnotation({
        id,
        kind: "line" as AnnotationKind,
        source: "ai",
        anchor,
        tone: tone(raw.tone),
        label: short(raw.label),
      });
    }
    return makeAnnotation({
      id,
      kind: "range" as AnnotationKind,
      source: "ai",
      anchor: { ...anchor, column: column + 1, endColumn: column + 1 + text.length },
      tone: tone(raw.tone),
      label: short(raw.label),
    });
  }

  if (name === "add_note") {
    const body = String(raw.body ?? "").trim();
    if (!body) return null;
    return makeAnnotation({ id, kind: "note" as AnnotationKind, source: "ai", anchor, tone: "info", body });
  }

  if (name === "flag_problem") {
    const message = String(raw.message ?? "").trim();
    if (!message) return null;
    const severity: AnnotationTone = raw.severity === "error" ? "danger" : "warning";
    return makeAnnotation({
      id,
      kind: "problem" as AnnotationKind,
      source: "ai",
      anchor,
      tone: severity,
      label: message,
    });
  }

  if (name === "show_memory") {
    const rawVars = Array.isArray(raw.variables) ? raw.variables : [];
    const variables = rawVars
      .filter((v): v is string | number => typeof v === "string" || typeof v === "number")
      .map((v) => String(v))
      .slice(0, 8);
    return makeAnnotation({ id, kind: "memory" as AnnotationKind, source: "ai", anchor, tone: "info", variables });
  }

  return null;
}
