/**
 * System prompt + context/message builders for the Socratic coding assistant.
 *
 * Ported 1:1 from the former `backend/app/ai/prompts.py` — this now runs
 * server-side inside the Next.js app (see `app/api/chat/route.ts`) since it's
 * just prompt-building + an API call, not something that needs Python.
 */

import type { ChatMessage, ExecutionTrace, ProjectFile } from "@/lib/types";

export const SYSTEM = `\
You are NOESIS, an AI coding assistant embedded next to a code editor. You
currently help with Python only.

Your default mode is Socratic, not solution-first. When the user is stuck,
confused, or their code errored/misbehaved and they're asking what's wrong or
why it doesn't work: do NOT give the fix immediately. Ask one focused guiding
question at a time — point at a specific line, value, or piece of behavior
when you can — and wait for their reply. Budget roughly 3-4 such guiding
turns (read the number of your own prior turns in the conversation so far —
there is no external counter) before stating the direct answer plainly.

It's fine to skip the Socratic ramp and answer directly when:
- the question is a simple factual/syntax lookup with no bug to diagnose
  (e.g. "what does zip do", "how do I open a file"),
- the user explicitly asks for the answer ("just tell me", "I give up"),
- you've already spent your guiding-question budget and the user is still
  stuck — at that point, explain plainly rather than stalling forever,
- the user is asking for a code review / style opinion rather than debugging
  a concrete failure.

Hard rules:
- Never claim to have edited the user's file — there is no apply mechanism.
  If you propose a change, show a short snippet and explain why; don't imply
  you already applied it.
- Always ground your answer in the actual file contents, other files in the
  project, and the most recent run's output/error/trace provided to you —
  never generic advice detached from their real code.
- Be concise. Prefer one sharp question or a short paragraph over a wall of
  text.
- If the user pastes non-Python code, say you can currently only run/trace
  Python.
`;

/** Render a deterministic markdown context block. No AI call. */
export function renderContextBlock(
  files: ProjectFile[],
  activePath: string | null,
  lastTrace: ExecutionTrace | null,
): string {
  const parts: string[] = [];

  const activeFile = find(files, activePath) ?? files[0] ?? null;
  if (activeFile) {
    parts.push(`## Active file: \`${activeFile.path}\`\n\`\`\`python\n${activeFile.content}\n\`\`\``);
  } else {
    parts.push("## Active file\n(no file open)");
  }

  const others = files.filter((f) => !activeFile || f.path !== activeFile.path).map((f) => f.path);
  if (others.length > 0) {
    parts.push("Also in project: " + others.join(", "));
  }

  if (lastTrace) {
    if (lastTrace.error) {
      parts.push(`## Last run\nError: ${lastTrace.error}`);
    } else {
      parts.push(
        "## Last run\n" +
          `stdout:\n\`\`\`\n${lastTrace.stdout}\n\`\`\`\n` +
          `final variables: ${JSON.stringify(lastTrace.finalLocals)}`,
      );
    }
  }

  return parts.join("\n\n");
}

export type AnthropicMessage = { role: "user" | "assistant"; content: string };

/**
 * Map prior turns + the new user turn into Anthropic-shaped messages.
 *
 * Anthropic requires the first message to have role "user". `history` is
 * always frontend-supplied conversation turns starting with the user's
 * first message, so this holds by construction — but we defensively drop
 * any leading assistant messages in case that invariant is ever violated.
 */
export function buildMessages(
  history: ChatMessage[],
  newMessage: string,
  contextBlock: string,
): AnthropicMessage[] {
  const messages: AnthropicMessage[] = history.map((m) => ({ role: m.role, content: m.content }));
  while (messages.length > 0 && messages[0].role !== "user") {
    messages.shift();
  }

  messages.push({ role: "user", content: `${contextBlock}\n\n${newMessage}` });
  return messages;
}

function find(files: ProjectFile[], path: string | null): ProjectFile | null {
  if (path === null) return null;
  return files.find((f) => f.path === path) ?? null;
}
