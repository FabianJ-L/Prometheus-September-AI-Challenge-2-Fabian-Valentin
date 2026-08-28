"use client";

import { useSettings } from "@/lib/settings";
import { TOKEN_CLASS, tokenizePython } from "@/lib/syntax";
import { cn } from "@/lib/utils";

/**
 * Read-only code surface with editor chrome.
 *
 * NOESIS lessons are about reading and predicting, not typing — so this is a
 * viewer, but it carries the affordances a student expects from an editor:
 * gutter, line numbers, an execution cursor and a focus marker.
 */
export function CodeEditor({
  code,
  filename = "main.py",
  activeLine,
  focusLine,
  className,
}: {
  code: string;
  filename?: string;
  /** Line currently being executed. */
  activeLine?: number;
  /** Line the teacher is pointing at. */
  focusLine?: number;
  className?: string;
}) {
  const { settings } = useSettings();
  const lines = code.split("\n");

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-lg border border-line bg-surface", className)}>
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-line px-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[12px] text-fg-muted">{filename}</span>
          {settings.sandboxMode && (
            <span className="text-2xs text-fg-subtle">· sandboxed</span>
          )}
        </div>
        <span className="label-caps">Python</span>
      </div>

      <div className="overflow-x-auto py-2.5" style={{ fontSize: "var(--code-font-size)" }}>
        <pre className="font-mono leading-[1.7]">
          <code>
            {lines.map((line, i) => {
              const lineNo = i + 1;
              const isActive = activeLine === lineNo;
              const isFocus = focusLine === lineNo && !isActive;
              return (
                <div
                  key={lineNo}
                  className={cn(
                    "relative flex px-4 transition-colors duration-200",
                    isActive && "bg-accent/[0.09]",
                    isFocus && "bg-warning/[0.08]",
                  )}
                >
                  {(isActive || isFocus) && (
                    <span
                      className={cn(
                        "absolute left-0 top-0 h-full w-[2px]",
                        isActive ? "bg-accent" : "bg-warning",
                      )}
                    />
                  )}
                  {settings.lineNumbers && (
                    <span
                      className={cn(
                        "numeric mr-4 w-6 shrink-0 select-none text-right",
                        isActive ? "text-accent" : "text-fg-subtle/70",
                      )}
                    >
                      {lineNo}
                    </span>
                  )}
                  <span className="mr-2 w-2 shrink-0 select-none text-accent">
                    {isActive ? "›" : " "}
                  </span>
                  <span className="whitespace-pre">
                    {tokenizePython(line).map((t, j) => (
                      <span key={j} className={TOKEN_CLASS[t.kind]}>
                        {t.value}
                      </span>
                    ))}
                    {line === "" ? " " : ""}
                  </span>
                </div>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
}
