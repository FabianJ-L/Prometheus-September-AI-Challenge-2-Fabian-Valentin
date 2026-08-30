"use client";

import { Eye, EyeOff, Play, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { TraceDebugger } from "@/components/workspace/TraceDebugger";
import { useWorkspace } from "@/lib/workspace";
import { getWorkspaceService } from "@/lib/workspace-service";
import type { ExecutionTrace } from "@/lib/types";

/**
 * "Run" button plus two ways to look at the result:
 *  - "Ausgabe": just stdout/errors, the way running the program normally
 *    would look — nothing about how it got there.
 *  - "Nachvollziehen": a step debugger (TraceDebugger) for understanding
 *    *why* — line by line, with the variable state at each point.
 */
export function RunPanel() {
  const { state, dispatch } = useWorkspace();
  const {
    files,
    activePath,
    isRunning,
    lastTrace,
    connectionError,
    traceViewMode,
    annotations,
    showInlineValues,
  } = state;

  const run = () => {
    if (!activePath) return;
    getWorkspaceService().runCode(files, activePath);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-line px-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="label-caps shrink-0">Run</span>
          <Tabs
            label="Ansicht"
            value={traceViewMode}
            onChange={(mode) => dispatch({ type: "SET_TRACE_VIEW_MODE", mode })}
            options={[
              { value: "output", label: "Ausgabe" },
              { value: "debug", label: "Nachvollziehen" },
            ]}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {annotations.length > 0 && (
            <Badge tone="accent">
              {annotations.length} {annotations.length === 1 ? "Anmerkung" : "Anmerkungen"}
            </Badge>
          )}
          {traceViewMode === "debug" && (
            <Button
              size="sm"
              variant="ghost"
              aria-pressed={showInlineValues}
              title={showInlineValues ? "Werte im Editor ausblenden" : "Werte im Editor einblenden"}
              onClick={() => dispatch({ type: "SET_SHOW_INLINE_VALUES", show: !showInlineValues })}
            >
              {showInlineValues ? <Eye size={13} /> : <EyeOff size={13} />}
              Werte
            </Button>
          )}
          <Button size="sm" variant="primary" onClick={run} disabled={!activePath || isRunning}>
            <Play size={13} />
            {isRunning ? "Running…" : "Run"}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {connectionError && (
          <div className="flex shrink-0 items-center gap-1.5 border-b border-line px-3 py-2 font-mono text-[12.5px] text-warning">
            <TriangleAlert size={13} />
            {connectionError}
          </div>
        )}

        {!lastTrace && !isRunning && !connectionError ? (
          <p className="px-3 py-2 font-mono text-[12.5px] text-fg-subtle">
            Run {activePath ?? "a file"} to see its output and step trace.
          </p>
        ) : traceViewMode === "debug" ? (
          <TraceDebugger trace={lastTrace} isRunning={isRunning} />
        ) : (
          <OutputView trace={lastTrace} />
        )}
      </div>
    </div>
  );
}

function OutputView({ trace }: { trace: ExecutionTrace | null }) {
  if (!trace) return null;
  return (
    <div className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[12.5px] leading-relaxed">
      {trace.error ? (
        <div className="whitespace-pre-wrap text-danger">
          {trace.error}
          {trace.errorLine !== null && (
            <span className="ml-2 text-fg-subtle">(Zeile {trace.errorLine})</span>
          )}
        </div>
      ) : (
        <div className="whitespace-pre-wrap text-fg">{trace.stdout || "(no output)"}</div>
      )}
      {trace.truncated && (
        <Badge tone="warning" className="mt-2">
          Execution stopped early (step/time limit)
        </Badge>
      )}
    </div>
  );
}
