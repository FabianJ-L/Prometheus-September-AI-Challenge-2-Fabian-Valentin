/**
 * Groq adapter — a thin `fetch` wrapper against Groq's OpenAI-compatible
 * chat-completions endpoint. No SDK: this is a single non-streaming call per
 * round, so a dependency would only buy typings, at the cost of unwinding its
 * own request/response shape to fit `AIProvider` anyway.
 */

import type { AIConfig } from "./config";
import type { AIProvider, ChatCompletionMessage, ChatCompletionResult, ToolDefinition } from "./provider";

export class GroqProvider implements AIProvider {
  constructor(private readonly config: AIConfig) {}

  get isConfigured(): boolean {
    return this.config.apiKey !== null;
  }

  async createChatCompletion({
    messages,
    tools,
  }: {
    messages: ChatCompletionMessage[];
    tools?: ToolDefinition[];
  }): Promise<ChatCompletionResult> {
    const res = await fetch(`${this.config.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        ...(tools ? { tools, tool_choice: "auto" } : {}),
        reasoning_effort: this.config.reasoningEffort,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Groq request failed: ${res.status} ${detail}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const message = choice?.message ?? {};

    return {
      content: message.content ?? null,
      toolCalls: message.tool_calls ?? [],
      finishReason: choice?.finish_reason ?? "stop",
    };
  }
}
