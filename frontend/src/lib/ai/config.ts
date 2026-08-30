/**
 * AI provider configuration, read once per request from server env vars.
 *
 * This is the one place a model/provider swap touches: change the env vars
 * (or add a new `case` in `getProvider()` in `provider.ts`), nothing else in
 * the AI pipeline needs to know which provider is behind it.
 *
 * Server-only — never expose the API key via `NEXT_PUBLIC_*`. This module is
 * only ever imported from `app/api/ai/chat/route.ts`, which runs server-side.
 */

export interface AIConfig {
  /** Which provider implementation to use. "groq" today. */
  provider: string;
  baseURL: string;
  model: string;
  /** `null` means no key configured — the route handler falls back to mock mode. */
  apiKey: string | null;
  reasoningEffort: "low" | "medium" | "high";
}

export function getAIConfig(): AIConfig {
  return {
    provider: process.env.AI_PROVIDER || "groq",
    baseURL: process.env.AI_BASE_URL || "https://api.groq.com/openai/v1",
    model: process.env.AI_MODEL || "openai/gpt-oss-20b",
    apiKey: process.env.GROQ_API_KEY || null,
    reasoningEffort: (process.env.AI_REASONING_EFFORT as AIConfig["reasoningEffort"]) || "low",
  };
}
