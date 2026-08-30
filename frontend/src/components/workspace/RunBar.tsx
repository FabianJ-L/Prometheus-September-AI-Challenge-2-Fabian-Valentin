"use client";

import { useEffect, useState } from "react";
import {
  Boxes,
  Eye,
  EyeOff,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";
import { getWorkspaceService } from "@/lib/workspace-service";

const PLAY_INTERVAL_MS = 700;

/**
 * The run, as one instrument: a timeline and a console. No tabs.
 *
 * "Output" and "step through it" were never two views — they are one view at
 * two positions of the same timeline. Scrubbed to the end, the console shows
 * the finished output, which is exactly what the old output tab showed; anyone
 * who never touches the slider loses nothing. What goes away is a mode.
 *
 * Everything that answers *where in the code* lives in the editor: the current
 * line, the values, the memory. This bar only answers *when in the run*.
 */
export function RunBar() {
  const { state, dispatch } = useWorkspace();
  const {
    files,
    activePath,
    isRunning,
    lastTrace,
    connectionError,
    annotations,
    showInlineValues,
    showMemory,
    debugStepIndex,
  } = state;
  const [playing, setPlaying] = useState(false);

  const steps = lastTrace?.steps ?? [];
  const total = steps.length;
  const index = Math.max(0, Math.min(debugStepIndex, total - 1));
  const step = total > 0 ? steps[index] : null;
  const atEnd = index >= total - 1;

  const goTo = (next: number) =>
    dispatch({ type: "SET_DEBUG_STEP_INDEX", index: Math.max(0, Math.min(total - 1, next)) });

  useEffect(() => {
    if (!playing || total === 0 || atEnd) {
      if (atEnd) setPlaying(false);
      return;
    }
    const id = setInterval(() => goTo(index + 1), PLAY_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, index, total, atEnd]);

  const run = () => {
    if (!activePath) return;
    setPlaying(false);
    getWorkspaceService().runCode(files, activePath);
  };

  // A step records the state *before* its line runs, so the last step's stdout
  // is missing whatever that final line printed. At the end of the timeline the
  // finished output is the honest thing to show.
  const console_ = !lastTrace
    ? null
    : atEnd || step === null
      ? lastTrace.stdout
      : step.stdout;

  const scope = step ? (step.func === "<module>" ? "Modulebene" : `${step.func}()`) : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-3">
        <Button size="sm" variant="primary" onClick={run} disabled={!activePath || isRunning}>
          <Play size={13} />
          {isRunning ? "Läuft…" : "Run"}
        </Button>

        <div className="flex items-center gap-0.5">
          <Button size="sm" variant="ghost" aria-label="Erster Schritt" disabled={total === 0 || index === 0} onClick={() => goTo(0)}>
            <SkipBack size={13} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label="Schritt zurück"
            disabled={total === 0 || index === 0}
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
            aria-label={playing ? "Pause" : "Abspielen"}
            disabled={total === 0 || atEnd}
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? <Pause size={13} /> : <Play size={13} />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label="Schritt vor"
            disabled={total === 0 || atEnd}
            onClick={() => {
              setPlaying(false);
              goTo(index + 1);
            }}
          >
            <StepForward size={13} />
          </Button>
          <Button size="sm" variant="ghost" aria-label="Letzter Schritt" disabled={total === 0 || atEnd} onClick={() => goTo(total - 1)}>
            <SkipForward size={13} />
          </Button>
        </div>

        <input
          type="range"
          min={0}
          max={Math.max(total - 1, 0)}
          value={index}
          disabled={total === 0}
          onChange={(e) => {
            setPlaying(false);
            goTo(Number(e.target.value));
          }}
          className="mx-1 min-w-0 flex-1 accent-accent disabled:opacity-30"
          aria-label="Zeitachse des Laufs"
        />

        <span className="numeric shrink-0 whitespace-nowrap text-[12px] text-fg-muted">
          {total === 0 ? (
            "noch nicht gelaufen"
          ) : (
            <>
              Schritt {index + 1}/{total}
              {step && <span className="text-fg-subtle"> · Zeile {step.line} · {scope}</span>}
            </>
          )}
        </span>

        <div className="ml-1 flex shrink-0 items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            aria-pressed={showInlineValues}
            disabled={total === 0}
            title="Werte neben dem Code"
            onClick={() => dispatch({ type: "SET_SHOW_INLINE_VALUES", show: !showInlineValues })}
          >
            {showInlineValues ? <Eye size={13} /> : <EyeOff size={13} />}
            Werte
          </Button>
          <Button
            size="sm"
            variant={showMemory ? "secondary" : "ghost"}
            aria-pressed={showMemory}
            disabled={total === 0}
            title="Speicherbild an der aktuellen Zeile"
            onClick={() => dispatch({ type: "SET_SHOW_MEMORY", show: !showMemory })}
          >
            <Boxes size={13} />
            Speicher
          </Button>
          {annotations.length > 0 && (
            <Badge tone="accent">
              {annotations.length} {annotations.length === 1 ? "Anmerkung" : "Anmerkungen"}
            </Badge>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 font-mono text-[12.5px] leading-relaxed">
        {connectionError ? (
          <div className="flex items-center gap-1.5 text-warning">
            <TriangleAlert size={13} />
            {connectionError}
          </div>
        ) : isRunning ? (
          <span className="text-fg-subtle">Läuft…</span>
        ) : !lastTrace ? (
          <span className="text-fg-subtle">
            {activePath ?? "Eine Datei"} ausführen — dann läuft die Zeitachse hier mit.
          </span>
        ) : (
          <>
            {lastTrace.error && atEnd && (
              <div className="whitespace-pre-wrap text-danger">
                {lastTrace.error}
                {lastTrace.errorLine !== null && (
                  <span className="ml-2 text-fg-subtle">(Zeile {lastTrace.errorLine})</span>
                )}
              </div>
            )}
            <div className={cn("whitespace-pre-wrap", atEnd ? "text-fg" : "text-fg-muted")}>
              {console_ || (lastTrace.error ? "" : "(keine Ausgabe)")}
            </div>
            {!atEnd && console_ === "" && (
              <span className="text-fg-subtle">(bis hierhin noch nichts ausgegeben)</span>
            )}
            {lastTrace.truncated && atEnd && (
              <Badge tone="warning" className="mt-2">
                Lauf vorzeitig gestoppt (Schritt-/Zeitlimit)
              </Badge>
            )}
          </>
        )}
      </div>
    </div>
  );
}
