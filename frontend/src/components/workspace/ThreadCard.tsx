"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, ChevronDown, X } from "lucide-react";
import { Markdown } from "@/components/ui/Markdown";
import { cn } from "@/lib/utils";
import type { Thread } from "@/lib/types";

/**
 * A conversation rendered inside the editor, under the line it is about.
 *
 * This is what replaces a chat sidebar as the way in. The question was asked
 * at a line, so it is answered at that line: the student never describes a
 * location, and never looks away from the code to read the reply. What is left
 * on the right is an index of these threads, not the conversation itself.
 */

function Composer({
  placeholder,
  autoFocus,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  autoFocus?: boolean;
  onSubmit: (text: string) => void;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onSubmit(text);
    setDraft("");
  };

  return (
    <div className="flex items-end gap-1.5 rounded-md border border-line bg-bg px-2.5 py-1.5 focus-within:border-accent/60">
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel?.();
          }
          // Monaco owns the surrounding keymap; stop it from acting on typing.
          e.stopPropagation();
        }}
        rows={1}
        placeholder={placeholder}
        className="max-h-24 min-h-[19px] flex-1 resize-none bg-transparent font-sans text-[12.5px] leading-relaxed text-fg outline-none placeholder:text-fg-subtle"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!draft.trim()}
        aria-label="Senden"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent text-accent-fg transition-opacity disabled:opacity-30"
      >
        <ArrowUp size={11} />
      </button>
    </div>
  );
}

/** The empty state: an input at a line, before any thread exists there. */
export function AskComposer({
  line,
  onAsk,
  onCancel,
}: {
  line: number;
  onAsk: (text: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="noesis-zone-card noesis-zone-card--ask">
      <div className="flex items-center gap-1.5 pb-1.5">
        <Bot size={11} className="text-accent" />
        <span className="text-2xs font-medium uppercase tracking-[0.09em] text-accent">
          Frage zu Zeile {line}
        </span>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Abbrechen"
          className="ml-auto -mr-1 flex h-5 w-5 items-center justify-center rounded text-fg-subtle transition-colors hover:bg-raised hover:text-fg"
        >
          <X size={11} />
        </button>
      </div>
      <Composer
        autoFocus
        placeholder="Was passiert hier? Warum ist das Ergebnis anders?"
        onSubmit={onAsk}
        onCancel={onCancel}
      />
    </div>
  );
}

export function ThreadCard({
  thread,
  onReply,
  onClose,
  onCollapse,
}: {
  thread: Thread;
  onReply: (text: string) => void;
  onClose: () => void;
  onCollapse: () => void;
}) {
  const last = thread.messages[thread.messages.length - 1];
  const awaiting = thread.pending && last?.role === "user";

  return (
    <div className="noesis-zone-card noesis-zone-card--ai">
      <div className="flex items-center gap-1.5 pb-2">
        <Bot size={11} className="text-accent" />
        <span className="text-2xs font-medium uppercase tracking-[0.09em] text-accent">
          NOESIS{thread.anchor ? ` · Zeile ${thread.anchor.line}` : ""}
        </span>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Einklappen"
          className="ml-auto flex h-5 w-5 items-center justify-center rounded text-fg-subtle transition-colors hover:bg-raised hover:text-fg"
        >
          <ChevronDown size={11} />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Unterhaltung schließen"
          className="-mr-1 flex h-5 w-5 items-center justify-center rounded text-fg-subtle transition-colors hover:bg-raised hover:text-fg"
        >
          <X size={11} />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {thread.messages.map((message, i) => (
          <div
            key={i}
            className={cn(
              "text-[12.5px] leading-relaxed",
              message.role === "user"
                ? "self-end max-w-[85%] rounded-md bg-accent/10 px-2.5 py-1.5 text-fg"
                : "text-fg-muted",
            )}
          >
            {message.role === "assistant" ? (
              <Markdown text={message.content} />
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
        ))}

        {awaiting && (
          <p className="text-[12.5px] text-fg-subtle">
            <span className="noesis-thinking">denkt nach</span>
          </p>
        )}
      </div>

      {!thread.pending && (
        <div className="pt-2">
          <Composer placeholder="Nachfragen…" onSubmit={onReply} />
        </div>
      )}
    </div>
  );
}
