"use client";

import type { Dispatch } from "react";
import type { WorkspaceAction } from "@/lib/workspace";
import type {
  Anchor,
  Annotation,
  ChatMessage,
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
      case "annotations": {
        const annotations = (envelope.payload as { annotations?: Annotation[] })?.annotations ?? [];
        this.dispatch({ type: "SET_ANNOTATIONS", annotations });
        break;
      }
      case "focus_step": {
        // The assistant drives the debugger: "look at what happens here" takes
        // the student there instead of asking them to find it.
        const index = (envelope.payload as { index?: number })?.index;
        if (typeof index === "number") this.dispatch({ type: "SET_DEBUG_STEP_INDEX", index });
        break;
      }
      case "assistant_message": {
        const payload = envelope.payload as ChatMessage & { threadId?: string | null };
        this.dispatch({
          type: "REPLY_TO_THREAD",
          id: payload.threadId ?? null,
          message: { role: payload.role, content: payload.content, createdAt: payload.createdAt },
        });
        break;
      }
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
   */
  ask(message: string, anchor: Anchor | null, state: WorkspaceState): string {
    const threadId = `t${Date.now().toString(36)}`;
    const turn: ChatMessage = { role: "user", content: message, createdAt: new Date().toISOString() };
    this.dispatch?.({ type: "START_THREAD", id: threadId, anchor, message: turn });
    this.send({ type: "chat_message", payload: this.chatPayload(message, [], anchor, threadId, state) });
    return threadId;
  }

  /** Continue an existing thread, keeping its anchor and its history. */
  reply(threadId: string, message: string, state: WorkspaceState): void {
    const thread = state.threads.find((t) => t.id === threadId);
    if (!thread) return;
    const turn: ChatMessage = { role: "user", content: message, createdAt: new Date().toISOString() };
    this.dispatch?.({ type: "APPEND_TO_THREAD", id: threadId, message: turn });
    this.send({
      type: "chat_message",
      payload: this.chatPayload(message, thread.messages, thread.anchor, threadId, state),
    });
  }

  private chatPayload(
    message: string,
    history: ChatMessage[],
    anchor: Anchor | null,
    threadId: string,
    state: WorkspaceState,
  ) {
    return {
      message,
      history,
      files: state.files,
      activePath: state.activePath,
      lastTrace: state.lastTrace,
      debugStepIndex: state.lastTrace ? state.debugStepIndex : null,
      anchor,
      threadId,
    };
  }
}

let instance: WorkspaceService | null = null;

export function getWorkspaceService(): WorkspaceService {
  if (!instance) instance = new WorkspaceService();
  return instance;
}
