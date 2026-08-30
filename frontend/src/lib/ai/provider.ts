/**
 * Provider-agnostic chat-completion contract, modelled on the OpenAI/Groq
 * "chat completions with tools" shape (system/user/assistant/tool messages,
 * function-call tools). A new provider is a new class implementing
 * `AIProvider` plus a `case` in `getProvider()` below — nothing upstream
 * (prompts, tools, the route handler's loop) needs to change.
 */

import { getAIConfig, type AIConfig } from "./config";
import { GroqProvider } from "./groq";

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    /** JSON-encoded arguments — parse before use. */
    arguments: string;
  };
}

export type ChatCompletionMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface ChatCompletionResult {
  content: string | null;
  toolCalls: ToolCall[];
  finishReason: "stop" | "length" | "tool_calls" | "content_filter" | string;
}

export interface AIProvider {
  /** False when no API key is configured — callers should use the mock path. */
  readonly isConfigured: boolean;
  createChatCompletion(params: {
    messages: ChatCompletionMessage[];
    tools?: ToolDefinition[];
  }): Promise<ChatCompletionResult>;
}

export function getProvider(config: AIConfig = getAIConfig()): AIProvider {
  switch (config.provider) {
    case "groq":
    default:
      return new GroqProvider(config);
  }
}
