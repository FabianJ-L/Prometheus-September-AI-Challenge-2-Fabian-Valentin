"use client";

import { useState } from "react";
import { ArrowUp, MessagesSquare, PanelRightClose, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";
import { getWorkspaceService } from "@/lib/workspace-service";

/**
 * An index of the conversations, not a conversation.
 *
 * The talking happens in the editor, at the code it is about. What is useful
 * on the side is a list of what has been asked and where, so a thread that was
 * collapsed can be found again — plus somewhere to put the rare question that
 * genuinely isn't about a line. Collapsed to a rail by default, because a chat
 * pane that is always open quietly makes itself the main way in.
 */
export function ThreadList() {
  const { state, dispatch } = useWorkspace();
  const [draft, setDraft] = useState("");

  const open = state.threadListOpen;
  const threads = state.threads;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => dispatch({ type: "SET_THREAD_LIST_OPEN", open: true })}
        title="Unterhaltungen"
        className="flex h-full w-11 shrink-0 flex-col items-center gap-2 border-l border-line bg-surface pt-3 text-fg-subtle transition-colors hover:text-fg"
      >
        <MessagesSquare size={15} />
        {threads.length > 0 && (
          <span className="numeric rounded bg-accent/15 px-1 text-[10px] text-accent">
            {threads.length}
          </span>
        )}
      </button>
    );
  }

  const ask = () => {
    const text = draft.trim();
    if (!text) return;
    getWorkspaceService().ask(text, null, state);
    setDraft("");
  };

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-line bg-surface">
      <div className="flex h-11 shrink-0 items-center gap-1.5 border-b border-line px-3">
        <MessagesSquare size={14} className="text-accent" />
        <span className="label-caps">Unterhaltungen</span>
        <button
          type="button"
          onClick={() => dispatch({ type: "SET_THREAD_LIST_OPEN", open: false })}
          aria-label="Einklappen"
          className="ml-auto -mr-1 flex h-6 w-6 items-center justify-center rounded text-fg-subtle transition-colors hover:bg-raised hover:text-fg"
        >
          <PanelRightClose size={13} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5">
        {threads.length === 0 && (
          <p className="px-1 py-6 text-center text-[12.5px] leading-relaxed text-fg-muted">
            Frag direkt im Code: Zeile anklicken im Randstreifen, oder{" "}
            <kbd className="rounded border border-line bg-raised px-1 font-mono text-[11px]">⌘I</kbd>.
            Die Antwort erscheint dort, wo die Frage hingehört.
          </p>
        )}

        {threads.map((thread) => {
          const last = thread.messages[thread.messages.length - 1];
          return (
            <div
              key={thread.id}
              className="group rounded-md border border-line bg-raised px-2.5 py-2 transition-colors hover:border-line-strong"
            >
              <div className="flex items-center gap-1.5">
                <span className="numeric text-[11px] text-accent">
                  {thread.anchor ? `Zeile ${thread.anchor.line}` : "Allgemein"}
                </span>
                {thread.pending && <span className="text-[11px] text-fg-subtle">· denkt nach</span>}
                <button
                  type="button"
                  onClick={() => dispatch({ type: "CLOSE_THREAD", id: thread.id })}
                  aria-label="Unterhaltung schließen"
                  className="ml-auto flex h-4 w-4 items-center justify-center rounded text-fg-subtle opacity-0 transition-opacity hover:text-fg group-hover:opacity-100"
                >
                  <X size={10} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (thread.collapsed) dispatch({ type: "TOGGLE_THREAD", id: thread.id });
                  if (thread.anchor) dispatch({ type: "SET_ACTIVE_PATH", path: thread.anchor.path });
                }}
                className="mt-0.5 block w-full text-left text-[12.5px] leading-snug text-fg-muted"
              >
                <span className="line-clamp-2">{last?.content ?? ""}</span>
              </button>
              {thread.collapsed && (
                <span className="mt-1 block text-[11px] text-fg-subtle">eingeklappt — klicken zum Öffnen</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-line p-2.5">
        <div className="flex items-end gap-1.5 rounded-lg border border-line bg-raised px-2.5 py-2 focus-within:border-line-strong">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask();
              }
            }}
            rows={1}
            placeholder="Frage ohne Bezug zu einer Zeile…"
            className="max-h-24 min-h-[20px] flex-1 resize-none bg-transparent text-[12.5px] text-fg outline-none placeholder:text-fg-subtle"
          />
          <Button size="sm" variant="ghost" onClick={ask} disabled={!draft.trim()} aria-label="Senden">
            <ArrowUp size={12} />
          </Button>
        </div>
      </div>
    </aside>
  );
}
