"use client";

import { Play, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useWorkspace } from "@/lib/workspace";
import { getWorkspaceService } from "@/lib/workspace-service";

/** "Run" button + streamed step list + final stdout/error. */
export function RunPanel() {
  const { state } = useWorkspace();
  const { files, activePath, isRunning, lastTrace, connectionError } = state;

  const run = () => {
    if (!activePath) return;
    getWorkspaceService().runCode(files, activePath);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-line px-3">
        <span className="label-caps">Run</span>
        <Button size="sm" variant="primary" onClick={run} disabled={!activePath || isRunning}>
          <Play size={13} />
          {isRunning ? "Running…" : "Run"}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[12.5px] leading-relaxed">
        {connectionError && (
          <div className="mb-2 flex items-center gap-1.5 text-warning">
            <TriangleAlert size={13} />
            {connectionError}
          </div>
        )}

        {!lastTrace && !isRunning && !connectionError && (
          <p className="text-fg-subtle">Run {activePath ?? "a file"} to see its output and step trace.</p>
        )}

        {lastTrace && (
          <div className="space-y-3">
            {lastTrace.error ? (
              <div className="whitespace-pre-wrap text-danger">{lastTrace.error}</div>
            ) : (
              <div className="whitespace-pre-wrap text-fg">{lastTrace.stdout || "(no output)"}</div>
            )}
            {lastTrace.truncated && (
              <Badge tone="warning">Execution stopped early (step/time limit)</Badge>
            )}

            <div>
              <div className="label-caps mb-1.5">Steps ({lastTrace.steps.length})</div>
              <ol className="space-y-0.5">
                {lastTrace.steps.map((step) => (
                  <li key={step.step} className="flex gap-2 text-fg-muted">
                    <span className="numeric w-8 shrink-0 text-fg-subtle">L{step.line}</span>
                    <span className="min-w-0 flex-1 truncate">{step.source}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
