"use client";

import { useState } from "react";
import { FilePlus, FileCode2, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";

/** Flat file list (v1: no folders). Select / create / rename / delete. */
export function FileTree() {
  const { state, dispatch } = useWorkspace();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [creating, setCreating] = useState(false);
  const [newPath, setNewPath] = useState("");

  const startRename = (path: string) => {
    setRenaming(path);
    setDraft(path);
  };

  const commitRename = () => {
    if (renaming && draft && draft !== renaming) {
      dispatch({ type: "RENAME_FILE", path: renaming, nextPath: draft });
    }
    setRenaming(null);
  };

  const commitCreate = () => {
    const path = newPath.trim();
    if (path) dispatch({ type: "CREATE_FILE", path: path.endsWith(".py") ? path : `${path}.py` });
    setCreating(false);
    setNewPath("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-line px-3">
        <span className="label-caps">Files</span>
        <button
          type="button"
          onClick={() => setCreating(true)}
          aria-label="New file"
          className="flex h-6 w-6 items-center justify-center rounded text-fg-subtle transition-colors hover:bg-raised hover:text-fg"
        >
          <FilePlus size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-1.5 py-1.5">
        {creating && (
          <input
            autoFocus
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            onBlur={commitCreate}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitCreate();
              if (e.key === "Escape") setCreating(false);
            }}
            placeholder="new_file.py"
            className="mb-1 h-7 w-full rounded border border-line-strong bg-raised px-2 text-[12.5px] text-fg outline-none"
          />
        )}

        {state.files.map((file) => {
          const active = file.path === state.activePath;
          return (
            <div
              key={file.path}
              className={cn(
                "group flex h-7 items-center gap-1.5 rounded px-2 text-[12.5px] transition-colors",
                active ? "bg-accent/10 text-fg" : "text-fg-muted hover:bg-raised hover:text-fg",
              )}
            >
              <FileCode2 size={13} className={cn("shrink-0", active ? "text-accent" : "text-fg-subtle")} />
              {renaming === file.path ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setRenaming(null);
                  }}
                  className="h-5 min-w-0 flex-1 rounded border border-line-strong bg-surface px-1 text-fg outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => dispatch({ type: "SET_ACTIVE_PATH", path: file.path })}
                  className="min-w-0 flex-1 truncate text-left"
                >
                  {file.path}
                </button>
              )}
              <span className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                <button
                  type="button"
                  aria-label={`Rename ${file.path}`}
                  onClick={() => startRename(file.path)}
                  className="flex h-5 w-5 items-center justify-center rounded text-fg-subtle hover:text-fg"
                >
                  <Pencil size={11} />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${file.path}`}
                  onClick={() => dispatch({ type: "DELETE_FILE", path: file.path })}
                  className="flex h-5 w-5 items-center justify-center rounded text-fg-subtle hover:text-danger"
                >
                  <X size={11} />
                </button>
              </span>
            </div>
          );
        })}

        {state.files.length === 0 && (
          <p className="px-2 py-4 text-center text-[12px] text-fg-subtle">No files yet.</p>
        )}
      </div>
    </div>
  );
}
