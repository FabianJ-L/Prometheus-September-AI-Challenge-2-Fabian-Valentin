/**
 * Domain types for the NOESIS workspace.
 *
 * Mirrors `backend/app/models/schemas.py` field-for-field — change both
 * together. The backend serialises snake_case fields as camelCase, so the
 * names below are the names on the wire.
 */

export type ChatRole = "user" | "assistant";

export interface ProjectFile {
  path: string;
  content: string;
  language: "python"; // widen to a union once more languages are supported
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
  createdAt: string; // ISO
}

/**
 * A conversation pinned to a place in the code.
 *
 * This is the shape that replaces a chat log. A question asked at line 4
 * carries line 4 with it, so neither side has to describe where "this" is —
 * and the reply can be rendered at the code it is about instead of in a
 * scrollback somewhere else on screen. `anchor: null` is the fallback for a
 * question that genuinely isn't about one place.
 */
export interface Thread {
  id: string;
  anchor: Anchor | null;
  messages: ChatMessage[];
  /** Waiting on a reply. */
  pending: boolean;
  /** Collapsed to a gutter marker rather than opened in the editor. */
  collapsed: boolean;
}

/* -------------------------------------------------------------------------
 * Traced values
 *
 * A value is either a JSON primitive or a reference into the step's heap.
 * Splitting objects out of the bindings is what makes aliasing visible: two
 * names carrying the same `$ref` are two names for one object.
 * ---------------------------------------------------------------------- */

export const REF_KEY = "$ref";

export interface HeapRef {
  $ref: string;
}

export type TraceValue = string | number | boolean | null | HeapRef;

export interface HeapEntry {
  key: string;
  value: TraceValue;
}

export interface HeapObject {
  id: string;
  type: string; // "list" | "tuple" | "set" | "dict" | "object"
  preview: string;
  size: number;
  elements: TraceValue[] | null;
  entries: HeapEntry[] | null;
  truncated: boolean;
}

export type Heap = Record<string, HeapObject>;

export type TraceEvent = "line" | "call" | "return" | "exception";

export interface TraceStep {
  step: number;
  line: number;
  source: string;
  event: TraceEvent;
  func: string; // enclosing function, "<module>" at top level
  depth: number; // call depth, 0 = module level
  locals: Record<string, TraceValue>;
  heap: Heap;
  stdout: string;
}

export interface ExecutionTrace {
  entryPath: string;
  steps: TraceStep[];
  finalLocals: Record<string, TraceValue>;
  finalHeap: Heap;
  stdout: string;
  error: string | null;
  errorLine: number | null;
  truncated: boolean;
}

/* -------------------------------------------------------------------------
 * Annotations — the editor's second output channel
 * ---------------------------------------------------------------------- */

export type AnnotationKind = "line" | "range" | "note" | "problem" | "value" | "memory";

export type AnnotationTone =
  | "neutral"
  | "info"
  | "focus"
  | "success"
  | "warning"
  | "danger";

/**
 * "measured" is derived from the trace and cannot be wrong. "ai" is an
 * interpretation and can be. They are rendered in visibly different languages,
 * and that distinction is load-bearing.
 */
export type AnnotationSource = "measured" | "ai";

export interface Anchor {
  path: string;
  line: number;
  endLine: number | null;
  column: number | null;
  endColumn: number | null;
  /** The text expected on that line — how drift is detected after an edit. */
  snippet: string | null;
}

export interface Annotation {
  id: string;
  kind: AnnotationKind;
  source: AnnotationSource;
  anchor: Anchor;
  tone: AnnotationTone;
  label: string | null;
  body: string | null; // markdown, for notes
  variables: string[]; // for memory diagrams
  threadId: string | null; // the conversation that placed it
  stale: boolean;
}

/* -------------------------------------------------------------------------
 * Wire shapes for the AI chat turn (`POST /api/ai/chat`)
 * ---------------------------------------------------------------------- */

/* -------------------------------------------------------------------------
 * Predict-before-run
 *
 * A prediction is the student's committed guess, made before a run exists.
 * Once a trace comes back, it's diffed into a `PredictionContext` — the
 * comparison the UI renders and the AI reasons about.
 * ---------------------------------------------------------------------- */

export interface Prediction {
  target: string; // human-readable label, e.g. "Ausgabe"
  value: string; // what the student typed, raw
}

export interface PredictionContext {
  target: string;
  predicted: string; // trimmed
  actual: string; // trace.stdout, trimmed — raw, unjudged
}

export interface ChatRequestPayload {
  message: string;
  history: ChatMessage[];
  files: ProjectFile[];
  activePath: string | null;
  lastTrace: ExecutionTrace | null;
  debugStepIndex: number | null;
  anchor: Anchor | null;
  threadId: string | null;
  prediction: PredictionContext | null;
}

export interface ChatResponsePayload {
  message: ChatMessage;
  annotations: Annotation[];
  threadId: string | null;
  /** Step the assistant wants the debugger moved to. */
  focusStep: number | null;
  mock: boolean;
}

export interface WorkspaceState {
  files: ProjectFile[];
  activePath: string | null;
  /** Conversations, each pinned to a line (or not, for general questions). */
  threads: Thread[];
  lastTrace: ExecutionTrace | null;
  isRunning: boolean;
  isAssistantThinking: boolean;
  connectionError: string | null;
  /** Position on the run's timeline. Output and stepping are the same view at
   *  two positions of it, so there is no mode to switch. */
  debugStepIndex: number;
  /** Marks the assistant placed on the code, newest reply only. */
  annotations: Annotation[];
  /** Inline values in the editor at the current debug step. */
  showInlineValues: boolean;
  /** Memory diagram pinned to the line the debugger is on. */
  showMemory: boolean;
  /** Line whose "ask here" composer is open, if any. */
  composingAt: number | null;
  /** The side panel is an index of threads, not the primary way in. */
  threadListOpen: boolean;
  /** The student's committed guess for this run, made before executing. */
  prediction: Prediction | null;
}
