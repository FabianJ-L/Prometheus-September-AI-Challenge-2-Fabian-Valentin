/**
 * Thin wrapper around the Anthropic Messages API.
 *
 * Ported 1:1 from the former `backend/app/ai/client.py`. Falls back to
 * `mock` mode when no API key is configured so the whole app still runs
 * offline. Server-only — never import this from client components.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { AnthropicMessage } from "@/lib/ai/prompts";

const MOCK_REPLY =
  "(offline mode — no ANTHROPIC_API_KEY configured) I can't generate real " +
  "guidance right now, but you can still run your code and inspect the trace.";
const ERROR_REPLY = "Something went wrong reaching the AI. Try again in a moment.";

class AIClient {
  private client: Anthropic | null = null;
  private readonly model: string;
  private readonly thinking: string;
  private readonly maxTokens: number;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    this.model = process.env.NOESIS_AI_MODEL ?? "claude-opus-5";
    this.thinking = process.env.NOESIS_AI_THINKING ?? "adaptive";
    this.maxTokens = Number(process.env.NOESIS_AI_MAX_TOKENS ?? 4096);

    if (apiKey) {
      try {
        this.client = new Anthropic({ apiKey });
      } catch (err) {
        console.error("Anthropic client init failed; falling back to mock mode", err);
        this.client = null;
      }
    }
  }

  get isMock(): boolean {
    return this.client === null;
  }

  /**
   * Send a multi-turn chat completion and return the plain-text reply.
   *
   * Never throws and never returns an empty string — in mock mode or on any
   * failure it returns a clear, honest fallback string so the UI always has
   * something to render.
   */
  async chat(system: string, messages: AnthropicMessage[]): Promise<string> {
    if (this.client === null) {
      return MOCK_REPLY;
    }

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system,
        messages,
        ...(this.thinking === "adaptive" ? { thinking: { type: "adaptive" } } : {}),
      });
      const text = message.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");
      return text.trim() || ERROR_REPLY;
    } catch (err) {
      console.error("AI chat completion failed", err);
      return ERROR_REPLY;
    }
  }
}

let instance: AIClient | null = null;

export function getAIClient(): AIClient {
  if (!instance) instance = new AIClient();
  return instance;
}
