/**
 * Domain types for the NOESIS workspace.
 *
 * Mirrors `backend/app/models/schemas.py` field-for-field — change both
 * together.
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

export interface WorkspaceState {
  files: ProjectFile[];
  activePath: string | null;
  chatHistory: ChatMessage[];
  lastTrace: ExecutionTrace | null;
  isRunning: boolean;
  isAssistantThinking: boolean;
  connectionError: string | null;
}
