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

/* -------------------------------------------------------------------------
 * Traced values
 *
 * A value is either a JSON primitive or a reference into the step's heap.
 * Splitting objects out of the bindings is what makes aliasing visible: two
 * names carrying the same `$ref` are two names for one object.
 * ---------------------------------------------------------------------- */

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
  stale: boolean;
}

export type TraceViewMode = "output" | "debug";

export interface WorkspaceState {
  files: ProjectFile[];
  activePath: string | null;
  chatHistory: ChatMessage[];
  lastTrace: ExecutionTrace | null;
  isRunning: boolean;
  isAssistantThinking: boolean;
  connectionError: string | null;
  /** "output": plain stdout, like actually running the program.
   *  "debug": step through lines with the variable state at each one. */
  traceViewMode: TraceViewMode;
  /** Index into `lastTrace.steps` the debug view is currently showing. */
  debugStepIndex: number;
  /** Marks the assistant placed on the code, newest reply only. */
  annotations: Annotation[];
  /** Inline values in the editor at the current debug step. */
  showInlineValues: boolean;
}
