import { cn } from "@/lib/utils";
import type { Phase } from "@/lib/session";

const PHASE_ORDER: Phase[] = [
  "predict",
  "predicted",
  "executing",
  "compare",
  "diagnose",
  "teach",
  "understood",
  "complete",
];

const PHASE_LABEL: Partial<Record<Phase, string>> = {
  predict: "Predict",
  executing: "Execute",
  compare: "Compare",
  diagnose: "Diagnose",
  teach: "Understand",
  complete: "Retest",
};

const RAIL: Array<{ phase: Phase; label: string }> = (
  ["predict", "executing", "compare", "diagnose", "teach", "complete"] as Phase[]
).map((phase) => ({ phase, label: PHASE_LABEL[phase] ?? phase }));

/** Where the student is inside the loop — the loop itself, made visible. */
export function LoopProgress({ phase, className }: { phase: Phase; className?: string }) {
  const currentIndex = PHASE_ORDER.indexOf(phase);

  return (
    <ol className={cn("flex items-center gap-0", className)} aria-label="Learning loop progress">
      {RAIL.map((stage, i) => {
        const stageIndex = PHASE_ORDER.indexOf(stage.phase);
        const done = currentIndex > stageIndex;
        const active = currentIndex === stageIndex || (i === 0 && phase === "predicted");
        return (
          <li key={stage.phase} className="flex items-center">
            {i > 0 && (
              <span
                aria-hidden
                className={cn(
                  "mx-1.5 h-px w-6 transition-colors duration-300",
                  done || active ? "bg-accent/50" : "bg-line",
                )}
              />
            )}
            <span
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex items-center gap-1.5 text-[12px] transition-colors duration-200",
                active ? "text-fg" : done ? "text-fg-muted" : "text-fg-subtle/70",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors duration-200",
                  active ? "bg-accent ring-4 ring-accent/15" : done ? "bg-accent/60" : "bg-line-strong",
                )}
              />
              {stage.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Position within the unit, e.g. 3 / 5. */
export function UnitProgress({ index, total }: { index: number; total: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 w-5 rounded-full",
              i < index - 1 ? "bg-accent/50" : i === index - 1 ? "bg-accent" : "bg-line",
            )}
          />
        ))}
      </div>
      <span className="numeric text-[12px] text-fg-subtle">
        {index} / {total}
      </span>
    </div>
  );
}
