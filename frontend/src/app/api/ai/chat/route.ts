/**
 * One turn of the Socratic coding assistant. Runs entirely in this Next.js
 * route handler — no dependency on the Python backend, which only handles
 * code execution/tracing (`/api/run`, WS `run_code`).
 *
 * Mirrors `backend/app/workspace.py::handle_chat` (now removed): mock branch
 * when no provider key is configured, else a bounded tool-call loop against
 * the configured AI provider (Groq by default — see `lib/ai/provider.ts`).
 */

import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/ai/provider";
import { buildMessages, renderContextBlock } from "@/lib/ai/prompts";
import { TOOLS, buildAnnotation, readFocusStep } from "@/lib/ai/tools";
import { offlineAnnotations } from "@/lib/ai/mock";
import type { Annotation, ChatMessage, ChatRequestPayload, ChatResponsePayload } from "@/lib/types";

export const runtime = "nodejs";

// gpt-oss-20b does not support parallel tool calls (unlike Anthropic, which
// could return several tool_use blocks in one response), so each round here
// yields at most one tool call — budget more rounds so a reply can still
// place 2-3 annotations.
const MAX_ROUNDS = 8;
// Past this the editor stops being a lesson and starts being a wall of highlighter.
const MAX_ANNOTATIONS = 6;

const MOCK_REPLY =
  "Offline-Modus — ohne `GROQ_API_KEY` in `frontend/.env.local` kann ich nicht " +
  "wirklich mitdenken. Die Marker im Editor kommen hier direkt aus dem Trace, " +
  "nicht aus einem Modell.";
const ERROR_REPLY = "Something went wrong reaching the AI. Try again in a moment.";
const REFUSAL_REPLY =
  "I can't help with that one. Ask me about the Python in your editor and I'm all yours.";

function assistantMessage(content: string): ChatMessage {
  return { role: "assistant", content, createdAt: new Date().toISOString() };
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ChatRequestPayload;
  const provider = getProvider();

  if (!provider.isConfigured) {
    // No key: say so plainly, and let the trace speak for itself.
    const marks = offlineAnnotations(
      body.files,
      body.activePath,
      body.lastTrace,
      body.anchor,
      body.prediction,
    ).map((a) => ({
      ...a,
      threadId: body.threadId,
    }));
    return NextResponse.json({
      message: assistantMessage(MOCK_REPLY),
      annotations: marks,
      threadId: body.threadId,
      focusStep: null,
      mock: true,
    } satisfies ChatResponsePayload);
  }

  const totalSteps = body.lastTrace?.steps.length ?? 0;
  const annotations: Annotation[] = [];
  let focusStep: number | null = null;

  /**
   * Validate one tool call and tell the model what actually happened. The
   * honesty here is deliberate: when an anchor is rejected the model finds
   * out inside the same turn, so it can re-anchor instead of writing prose
   * about a mark the student cannot see.
   */
  function handleToolCall(name: string, rawArgs: string): string {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawArgs);
    } catch {
      return "That annotation could not be placed. Continue without it.";
    }

    if (name === "focus_step") {
      const resolved = readFocusStep(payload, totalSteps);
      if (!resolved) {
        return (
          `Not moved: there is no such step in the last run (${totalSteps} steps).` +
          " Leave the debugger where it is."
        );
      }
      focusStep = resolved.index;
      return `Debugger moved to step ${resolved.index + 1}.`;
    }

    if (annotations.length >= MAX_ANNOTATIONS) {
      return "Annotation limit reached for this reply. Say the rest in your text.";
    }

    const annotation = buildAnnotation(name, payload, body.files, body.activePath, annotations.length);
    if (!annotation) {
      return (
        "Not placed: no line matches that snippet. Copy the line " +
        "verbatim from the file above, or leave this point to your text."
      );
    }

    annotation.threadId = body.threadId;
    annotations.push(annotation);
    return `Placed on line ${annotation.anchor.line}.`;
  }

  const context = renderContextBlock(
    body.files,
    body.activePath,
    body.lastTrace,
    body.debugStepIndex,
    body.anchor,
    body.prediction,
  );
  const turns = buildMessages(body.history, body.message, context);
  const collected: string[] = [];

  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const result = await provider.createChatCompletion({ messages: turns, tools: TOOLS });

      if (result.finishReason === "content_filter") {
        return NextResponse.json({
          message: assistantMessage(REFUSAL_REPLY),
          annotations: [],
          threadId: body.threadId,
          focusStep: null,
          mock: false,
        } satisfies ChatResponsePayload);
      }

      const text = (result.content ?? "").trim();
      if (text) collected.push(text);

      if (result.toolCalls.length === 0) break;

      turns.push({ role: "assistant", content: result.content, tool_calls: result.toolCalls });
      for (const call of result.toolCalls) {
        turns.push({
          role: "tool",
          tool_call_id: call.id,
          content: handleToolCall(call.function.name, call.function.arguments),
        });
      }
    }
  } catch {
    const text = collected.join("\n\n").trim() || ERROR_REPLY;
    return NextResponse.json({
      message: assistantMessage(text),
      annotations,
      threadId: body.threadId,
      focusStep,
      mock: false,
    } satisfies ChatResponsePayload);
  }

  const text = collected.join("\n\n").trim() || ERROR_REPLY;
  return NextResponse.json({
    message: assistantMessage(text),
    annotations,
    threadId: body.threadId,
    focusStep,
    mock: false,
  } satisfies ChatResponsePayload);
}
