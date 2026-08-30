"use client";

import type { Dispatch } from "react";
import type { WorkspaceAction } from "@/lib/workspace";
import type { ChatMessage, ExecutionTrace, ProjectFile, TraceStep, WorkspaceState } from "@/lib/types";

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL ?? "ws://localhost:8000";
const WS_URL = `${WS_BASE_URL}/api/ws/workspace`;
const RECONNECT_DELAY_MS = 1500;

type Envelope = { type: string; payload: unknown };

/**
 * Thin wrapper around a raw browser WebSocket, mirroring the request/response
 * shape of `backend/app/api/routes/ws.py`, plus a `fetch` call for chat
 * (handled entirely within this Next.js app — see `app/api/chat/route.ts`).
 * Dispatches incoming events straight into the workspace reducer. v1 keeps
 * reconnect simple: a single retry after a short delay, no exponential
 * backoff.
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
      case "trace_step":
        this.dispatch({ type: "APPEND_TRACE_STEP", step: envelope.payload as TraceStep });
        break;
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
    this.send({ type: "run_code", payload: { files, entry_path: entryPath } });
  }

  sendChatMessage(message: string, state: WorkspaceState): void {
    const userTurn: ChatMessage = { role: "user", content: message, createdAt: new Date().toISOString() };
    this.dispatch?.({ type: "APPEND_CHAT_MESSAGE", message: userTurn });
    this.dispatch?.({ type: "SET_ASSISTANT_THINKING", thinking: true });

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        history: state.chatHistory,
        files: state.files,
        activePath: state.activePath,
        lastTrace: state.lastTrace,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`chat request failed (${res.status})`);
        const reply = (await res.json()) as ChatMessage;
        this.dispatch?.({ type: "APPEND_CHAT_MESSAGE", message: reply });
      })
      .catch(() => {
        this.dispatch?.({ type: "SET_CONNECTION_ERROR", message: "Couldn't reach the AI assistant." });
      })
      .finally(() => {
        this.dispatch?.({ type: "SET_ASSISTANT_THINKING", thinking: false });
      });
  }
}

let instance: WorkspaceService | null = null;

export function getWorkspaceService(): WorkspaceService {
  if (!instance) instance = new WorkspaceService();
  return instance;
}
