"use client";

import { ArrowRight, ChevronLeft, ChevronRight, FastForward } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useSettings } from "@/lib/settings";
import type { ExecutionStep } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Step controls plus a scrubbable timeline of the whole run. */
export function ExecutionTrace({
  steps,
  currentStep,
  onStepTo,
  onPrevious,
  onNext,
  onRunToEnd,
  onFinish,
  atEnd,
}: {
  steps: ExecutionStep[];
  currentStep: number;
  onStepTo: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onRunToEnd: () => void;
  onFinish: () => void;
  atEnd: boolean;
}) {
  const { settings } = useSettings();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onPrevious} disabled={currentStep === 0} aria-label="Previous step">
          <ChevronLeft size={14} aria-hidden />
          Back
        </Button>

        {atEnd ? (
          <Button size="sm" variant="primary" onClick={onFinish}>
            Compare with your prediction
            <ArrowRight size={14} aria-hidden />
          </Button>
        ) : (
          <Button size="sm" variant="primary" onClick={onNext}>
            Continue execution
            <ChevronRight size={14} aria-hidden />
          </Button>
        )}

        <Button size="sm" variant="ghost" onClick={onRunToEnd} disabled={atEnd}>
          <FastForward size={14} aria-hidden />
          Run to end
        </Button>

        <span className="numeric ml-auto text-[12px] text-fg-subtle">
          Step {currentStep + 1} / {steps.length}
        </span>
      </div>

      {settings.showExecutionTimeline && (
        <div
          role="group"
          aria-label="Execution timeline"
          className="flex gap-1 overflow-x-auto rounded-md border border-line bg-surface p-2"
        >
          {steps.map((step, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <button
                key={step.index}
                type="button"
                onClick={() => onStepTo(i)}
                aria-label={`${step.label}, line ${step.line}`}
                aria-current={active ? "step" : undefined}
                title={`${step.label} · line ${step.line}`}
                className={cn(
                  "group flex min-w-[42px] flex-1 flex-col items-center gap-1.5 rounded px-1 py-1.5 transition-colors duration-150",
                  active ? "bg-accent/10" : "hover:bg-raised",
                )}
              >
                <span
                  className={cn(
                    "h-1 w-full rounded-full transition-colors duration-200",
                    active ? "bg-accent" : done ? "bg-accent/40" : "bg-line",
                  )}
                />
                <span
                  className={cn(
                    "numeric text-[10px] leading-none transition-colors",
                    active ? "text-accent" : done ? "text-fg-muted" : "text-fg-subtle/60",
                  )}
                >
                  {i + 1}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
