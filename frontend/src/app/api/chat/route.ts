import { NextResponse } from "next/server";

import { getAIClient } from "@/lib/ai/client";
import { SYSTEM, buildMessages, renderContextBlock } from "@/lib/ai/prompts";
import type { ChatMessage, ChatRequest } from "@/lib/types";

/**
 * `POST /api/chat` — one Socratic chat turn.
 *
 * Replaces the former `chat_message` WebSocket message / `POST /api/chat` on
 * the Python backend: this runs entirely in the Next.js server, since it's
 * just prompt-building + an Anthropic API call, not something that needs
 * Python. Stateless, same as before — the client resends the full context
 * (files, active file, last trace, chat history) with every call.
 */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as ChatRequest;

  const contextBlock = renderContextBlock(body.files, body.activePath, body.lastTrace);
  const messages = buildMessages(body.history, body.message, contextBlock);
  const content = await getAIClient().chat(SYSTEM, messages);

  const reply: ChatMessage = {
    role: "assistant",
    content,
    createdAt: new Date().toISOString(),
  };
  return NextResponse.json(reply);
}
