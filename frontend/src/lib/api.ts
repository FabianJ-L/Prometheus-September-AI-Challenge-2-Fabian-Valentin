// Typed client for the NOESIS backend.

import type { ConceptNode, ConceptState, Lesson, SessionState } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
export const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL ?? "ws://localhost:8000";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`${res.status} ${res.statusText} — ${detail}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => req<{ status: string; ai_mode: string; ai_model: string }>("/api/health"),

  listLessons: () => req<Lesson[]>("/api/lessons"),
  getLesson: (id: string) => req<Lesson>(`/api/lessons/${id}`),

  listConcepts: () => req<ConceptNode[]>("/api/concepts"),
  conceptState: () => req<ConceptState[]>("/api/concepts/state"),
  recommended: () => req<{ concept_id: string | null }>("/api/concepts/recommended"),

  startSession: (lessonId: string) =>
    req<SessionState>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ lesson_id: lessonId }),
    }),
  getSession: (id: string) => req<SessionState>(`/api/sessions/${id}`),
  submitPrediction: (id: string, answer: unknown, rationale?: string) =>
    req<SessionState>(`/api/sessions/${id}/prediction`, {
      method: "POST",
      body: JSON.stringify({ answer, rationale }),
    }),
  submitAnswer: (id: string, text: string) =>
    req<SessionState>(`/api/sessions/${id}/answer`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
};

// ---------------------------------------------------------------------------
// WebSocket helper for the live Predict → Execute → Diagnose loop.
// ---------------------------------------------------------------------------

export type LoopEvent =
  | { type: "session"; payload: SessionState }
  | { type: "step"; payload: import("@/lib/types").TraceStep }
  | { type: "error"; payload: { message: string } };

export function openLoopSocket(onEvent: (e: LoopEvent) => void): {
  send: (type: string, payload?: unknown) => void;
  close: () => void;
} {
  const ws = new WebSocket(`${WS_BASE}/api/ws/session`);
  const queue: string[] = [];

  ws.onopen = () => queue.splice(0).forEach((m) => ws.send(m));
  ws.onmessage = (ev) => onEvent(JSON.parse(ev.data) as LoopEvent);

  return {
    send: (type, payload) => {
      const msg = JSON.stringify({ type, payload });
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
      else queue.push(msg);
    },
    close: () => ws.close(),
  };
}
