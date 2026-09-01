"use client";

import type { Dispatch } from "react";
import type { WorkspaceAction } from "@/lib/workspace";
import { evaluatePrediction } from "@/lib/prediction";
import type {
  Anchor,
  ChatMessage,
  ChatRequestPayload,
  ChatResponsePayload,
  ExecutionTrace,
  ProjectFile,
  TraceStep,
  WorkspaceState,
} from "@/lib/types";

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL ?? "ws://localhost:8000";
const WS_URL = `${WS_BASE_URL}/api/ws/workspace`;
const RECONNECT_DELAY_MS = 1500;

type Envelope = { type: string; payload: unknown };

/**
 * Thin wrapper around a raw browser WebSocket, mirroring the request/response
 * shape of `backend/app/api/routes/ws.py`. Dispatches incoming events
 * straight into the workspace reducer. v1 keeps reconnect simple: a single
 * retry after a short delay, no exponential backoff.
 */
export class WorkspaceService {
  private socket: WebSocket | null = null;
  private dispatch: Dispatch<WorkspaceAction> | null = null;

  connect(dispatch: Dispatch<WorkspaceAction>): void {
    this.dispatch = dispatch;
    this.open();
  }

  private open(): void {
    if (typeof window === "undefined") return;
    const socket = new WebSocket(WS_URL);
    this.socket = socket;

    socket.onopen = () => this.dispatch?.({ type: "SET_CONNECTION_ERROR", message: null });

    socket.onmessage = (event) => {
      let envelope: Envelope;
      try {
        envelope = JSON.parse(event.data);
      } catch {
        return;
      }
      this.handleMessage(envelope);
    };

    socket.onerror = () => {
      this.dispatch?.({ type: "SET_CONNECTION_ERROR", message: "Lost connection to the backend." });
    };

    socket.onclose = () => {
      setTimeout(() => this.open(), RECONNECT_DELAY_MS);
    };
  }

  private handleMessage(envelope: Envelope): void {
    if (!this.dispatch) return;
    switch (envelope.type) {
      case "trace_batch": {
        const steps = (envelope.payload as { steps?: TraceStep[] })?.steps ?? [];
        if (steps.length > 0) this.dispatch({ type: "APPEND_TRACE_STEPS", steps });
        break;
      }
      case "run_result":
        this.dispatch({ type: "SET_RUN_RESULT", trace: envelope.payload as ExecutionTrace });
        break;
      case "error": {
        const message = (envelope.payload as { message?: string })?.message ?? "Something went wrong.";
        this.dispatch({ type: "SET_CONNECTION_ERROR", message });
        break;
      }
      default:
        break;
    }
  }

  private send(envelope: Envelope): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(envelope));
    } else {
      this.dispatch?.({ type: "SET_CONNECTION_ERROR", message: "Not connected to the backend yet." });
    }
  }

  runCode(files: ProjectFile[], entryPath: string): void {
    this.dispatch?.({ type: "SET_RUNNING", running: true });
    this.send({ type: "run_code", payload: { files, entryPath } });
  }

  /**
   * Ask a question. `anchor` is the line it was asked at — the whole point of
   * asking in the editor rather than in a chat box, because the assistant then
   * never has to guess what "this" refers to.
   *
   * Chat turns go to the Next.js `/api/ai/chat` route (not the WebSocket) —
   * the AI pipeline runs in the frontend, so there is no backend hop for it.
   */
  ask(message: string, anchor: Anchor | null, state: WorkspaceState): string {
    const threadId = `t${Date.now().toString(36)}`;
    const turn: ChatMessage = { role: "user", content: message, createdAt: new Date().toISOString() };
    this.dispatch?.({ type: "START_THREAD", id: threadId, anchor, message: turn });
    void this.sendChat(this.chatPayload(message, [], anchor, threadId, state));
    return threadId;
  }

  /** Continue an existing thread, keeping its anchor and its history. */
  reply(threadId: string, message: string, state: WorkspaceState): void {
    const thread = state.threads.find((t) => t.id === threadId);
    if (!thread) return;
    const turn: ChatMessage = { role: "user", content: message, createdAt: new Date().toISOString() };
    this.dispatch?.({ type: "APPEND_TO_THREAD", id: threadId, message: turn });
    void this.sendChat(this.chatPayload(message, thread.messages, thread.anchor, threadId, state));
  }

  /**
   * POST one chat turn to the frontend's own AI route and dispatch the
   * result — in the same order the WS `chat_message` reply used to arrive
   * in (annotations → focus step → assistant message), so the reducer needs
   * no changes.
   */
  private async sendChat(payload: ChatRequestPayload): Promise<void> {
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`ai chat failed: ${res.status}`);
      const data = (await res.json()) as ChatResponsePayload;

      if (data.annotations.length > 0) {
        this.dispatch?.({ type: "SET_ANNOTATIONS", annotations: data.annotations });
      }
      if (data.focusStep !== null) {
        this.dispatch?.({ type: "SET_DEBUG_STEP_INDEX", index: data.focusStep });
      }
      this.dispatch?.({
        type: "REPLY_TO_THREAD",
        id: data.threadId,
        message: {
          role: data.message.role,
          content: data.message.content,
          createdAt: data.message.createdAt,
        },
      });
    } catch {
      this.dispatch?.({ type: "SET_CONNECTION_ERROR", message: "Could not reach the assistant." });
    }
  }

  private chatPayload(
    message: string,
    history: ChatMessage[],
    anchor: Anchor | null,
    threadId: string,
    state: WorkspaceState,
  ): ChatRequestPayload {
    return {
      message,
      history,
      files: state.files,
      activePath: state.activePath,
      lastTrace: state.lastTrace,
      debugStepIndex: state.lastTrace ? state.debugStepIndex : null,
      anchor,
      threadId,
      prediction: evaluatePrediction(state.prediction, state.lastTrace?.stdout ?? null),
    };
  }
}

let instance: WorkspaceService | null = null;

export function getWorkspaceService(): WorkspaceService {
  if (!instance) instance = new WorkspaceService();
  return instance;
}
