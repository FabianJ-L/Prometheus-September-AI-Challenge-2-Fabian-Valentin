"use client";

import { useEffect, useState } from "react";
import { Boxes, Pause, Play, SkipBack, SkipForward, StepBack, StepForward, Table2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { MemoryDiagram } from "@/components/workspace/MemoryDiagram";
import { cn } from "@/lib/utils";
import { formatValue, hasChanged } from "@/lib/values";
import { useWorkspace } from "@/lib/workspace";
import type { ExecutionTrace } from "@/lib/types";

const PLAY_INTERVAL_MS = 700;

type Inspector = "table" | "memory";

/**
 * Step-by-step view of a finished run: the current line, the variables that
 * exist at that point (new/changed ones highlighted against the previous
 * step), and the output printed so far. Stepping is user-paced by design —
 * play/pause exists, but reading one line at a time and seeing what just
 * changed is the actual point of this view.
 *
 * Two ways to read the state: a table for "what is each name worth", and a
 * memory diagram for "what does each name point at" — the second is the only
 * one that can show two names sharing one object.
 */
export function TraceDebugger({ trace, isRunning }: { trace: ExecutionTrace | null; isRunning: boolean }) {
  const { state, dispatch } = useWorkspace();
  const [playing, setPlaying] = useState(false);
  const [inspector, setInspector] = useState<Inspector>("table");

  const steps = trace?.steps ?? [];
  const total = steps.length;
  const index = Math.max(0, Math.min(state.debugStepIndex, total - 1));

  const goTo = (next: number) =>
    dispatch({ type: "SET_DEBUG_STEP_INDEX", index: Math.max(0, Math.min(total - 1, next)) });

  useEffect(() => {
    if (!playing || index >= total - 1) {
      if (index >= total - 1) setPlaying(false);
      return;
    }
    const id = setInterval(() => goTo(index + 1), PLAY_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, index, total]);

  if (isRunning || total === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[12.5px] text-fg-subtle">
        {isRunning ? "Running…" : "No steps recorded."}
      </div>
    );
  }

  const step = steps[index];
  const previous = index > 0 ? steps[index - 1] : null;
  const varNames = Object.keys(step.locals);
  const scope = step.func === "<module>" ? "Modulebene" : `${step.func}()`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-line px-3 py-2">
        <Button size="sm" variant="ghost" aria-label="First step" disabled={index === 0} onClick={() => goTo(0)}>
          <SkipBack size={13} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Previous step"
          disabled={index === 0}
          onClick={() => {
            setPlaying(false);
            goTo(index - 1);
          }}
        >
          <StepBack size={13} />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          aria-label={playing ? "Pause" : "Play"}
          onClick={() => setPlaying((p) => !p)}
          disabled={index >= total - 1}
        >
          {playing ? <Pause size={13} /> : <Play size={13} />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Next step"
          disabled={index >= total - 1}
          onClick={() => {
            setPlaying(false);
            goTo(index + 1);
          }}
        >
          <StepForward size={13} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Last step"
          disabled={index >= total - 1}
          onClick={() => goTo(total - 1)}
        >
          <SkipForward size={13} />
        </Button>

        <input
          type="range"
          min={0}
          max={Math.max(total - 1, 0)}
          value={index}
          onChange={(e) => {
            setPlaying(false);
            goTo(Number(e.target.value));
          }}
          className="mx-2 flex-1 accent-accent"
          aria-label="Step"
        />

        <span className="numeric shrink-0 text-[12px] text-fg-muted">
          {index + 1} / {total}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <div className="mb-3 flex items-center gap-2 font-mono text-[12.5px]">
          <span className="numeric text-fg-subtle">L{step.line}</span>
          <span className="min-w-0 flex-1 truncate text-fg">{step.source}</span>
          <Badge tone="neutral">{scope}</Badge>
          {trace?.truncated && index === total - 1 && <Badge tone="warning">stopped early</Badge>}
        </div>

        <div className="mb-1.5 flex items-center justify-between gap-3">
          <span className="label-caps">Variablen</span>
          <Tabs
            label="Ansicht"
            value={inspector}
            onChange={setInspector}
            options={[
              { value: "table", label: "Werte", icon: <Table2 size={11} /> },
              { value: "memory", label: "Speicher", icon: <Boxes size={11} /> },
            ]}
          />
        </div>

        {varNames.length === 0 ? (
          <p className="mb-3 font-mono text-[12px] text-fg-subtle">(noch keine)</p>
        ) : inspector === "memory" ? (
          <div className="mb-3">
            <MemoryDiagram bindings={step.locals} heap={step.heap} />
          </div>
        ) : (
          <table className="mb-3 w-full border-collapse font-mono text-[12.5px]">
            <tbody>
              {varNames.map((name) => {
                const value = step.locals[name];
                const isNew = previous ? !(name in previous.locals) : true;
                const changed =
                  !isNew &&
                  previous !== null &&
                  hasChanged(name, step.locals, step.heap, previous.locals, previous.heap);
                return (
                  <tr key={name} className="border-b border-line last:border-0">
                    <td className="w-0 whitespace-nowrap py-1 pr-3 align-top text-fg-muted">{name}</td>
                    <td className={cn("py-1 align-top", isNew || changed ? "text-accent" : "text-fg")}>
                      {formatValue(value, step.heap)}
                      {(isNew || changed) && (
                        <Badge tone="accent" className="ml-2 align-middle">
                          {isNew ? "neu" : "geändert"}
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="label-caps mb-1.5">Ausgabe bis hierhin</div>
        <div className="whitespace-pre-wrap font-mono text-[12.5px] text-fg-muted">
          {step.stdout || "(noch keine)"}
        </div>
      </div>
    </div>
  );
}
