"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, MessageCircleQuestion } from "lucide-react";
import { Markdown } from "@/components/ui/Markdown";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";
import { getWorkspaceService } from "@/lib/workspace-service";

/** Chat scrollback + input. No token streaming in v1 — a reply arrives whole.
 *
 * The assistant's replies render Markdown; the user's stay verbatim, because
 * someone pasting code should see exactly what they pasted. */
export function ChatPanel() {
  const { state } = useWorkspace();
  const { chatHistory, isAssistantThinking } = state;
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [chatHistory.length, isAssistantThinking]);

  const send = () => {
    const message = draft.trim();
    if (!message) return;
    getWorkspaceService().sendChatMessage(message, state);
    setDraft("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center gap-1.5 border-b border-line px-3">
        <Bot size={14} className="text-accent" />
        <span className="label-caps">Assistant</span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {chatHistory.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <MessageCircleQuestion size={20} className="text-fg-subtle" />
            <p className="text-[12.5px] leading-relaxed text-fg-muted">
              Stuck, or not sure why your code does what it does? Ask — I&apos;ll help you find it
              rather than just tell you.
            </p>
          </div>
        )}

        {chatHistory.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[92%] rounded-lg px-3 py-2 text-[13px] leading-relaxed",
              msg.role === "user" ? "ml-auto bg-accent/10 text-fg" : "bg-raised text-fg",
            )}
          >
            {msg.role === "assistant" ? (
              <Markdown text={msg.content} />
            ) : (
              <p className="whitespace-pre-wrap">{msg.content}</p>
            )}
          </div>
        ))}

        {isAssistantThinking && (
          <div className="max-w-[92%] rounded-lg bg-raised px-3 py-2 text-[13px] text-fg-muted">
            Thinking…
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-line p-2.5">
        <div className="flex items-end gap-1.5 rounded-lg border border-line bg-raised px-2.5 py-2 focus-within:border-line-strong">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Ask about your code…"
            className="max-h-32 min-h-[20px] flex-1 resize-none bg-transparent text-[13px] text-fg outline-none placeholder:text-fg-subtle"
          />
          <button
            type="button"
            onClick={send}
            disabled={!draft.trim()}
            aria-label="Send"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-accent text-accent-fg transition-opacity disabled:opacity-30"
          >
            <ArrowUp size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
