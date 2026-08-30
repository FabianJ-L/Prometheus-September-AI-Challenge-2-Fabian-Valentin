/**
 * Domain types for the NOESIS workspace.
 *
 * `ProjectFile`, `TraceStep` and `ExecutionTrace` mirror
 * `backend/app/models/schemas.py` field-for-field — change both together.
 * `ChatMessage`/`ChatRequest` are TS-only: chat/AI runs entirely in this app
 * (see `lib/ai/`, `app/api/chat/route.ts`) and never touches the backend.
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

/** Body of `POST /api/chat`. */
export interface ChatRequest {
  message: string;
  history: ChatMessage[];
  files: ProjectFile[];
  activePath: string | null;
  lastTrace: ExecutionTrace | null;
}

export type TraceEvent = "line" | "call" | "return" | "exception";

export interface TraceStep {
  step: number;
  line: number;
  source: string;
  event: TraceEvent;
  locals: Record<string, unknown>;
  stdout: string;
}

export interface ExecutionTrace {
  entryPath: string;
  steps: TraceStep[];
  finalLocals: Record<string, unknown>;
  stdout: string;
  error: string | null;
  truncated: boolean;
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
}
