"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { InlineCode } from "@/components/learning/InlineCode";
import { LESSON_ITERATIONS } from "@/mock/teacher";
import type { Misconception } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Replays the run one iteration at a time with the student's implied model next
 * to reality, so the divergence is located rather than asserted.
 *
 * Deliberately does not explain the fix — that is the teacher's job, one
 * question later.
 */
export function MisconceptionView({
  misconception,
  lessonId,
  confidence,
  /** Appearance setting: name the misconception now, or hold it until the end. */
  nameMisconception,
  onContinue,
}: {
  misconception: Misconception;
  lessonId: string;
  confidence: number;
  nameMisconception: boolean;
  onContinue: () => void;
}) {
  const rowLabel = LESSON_ITERATIONS[lessonId]?.rowLabel ?? "Iteration";
  const hasModel = misconception.timeline.some((r) => r.studentModel !== null);

  return (
    <Card className="animate-fade-up">
      <CardHeader
        title="Divergence analysis"
        actions={
          <span className="numeric text-2xs text-fg-subtle">
            confidence {Math.round(confidence * 100)}%
          </span>
        }
      />
      <CardBody className="space-y-5">
        <p className="text-[13px] leading-relaxed text-fg">
          Let&apos;s find where your prediction diverged.
        </p>

        <div className="overflow-hidden rounded-md border border-line">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-line bg-raised px-4 py-2">
            <span className="label-caps">{rowLabel}</span>
            <span className="label-caps w-24 text-right">Your model</span>
            <span className="label-caps w-24 text-right">Actual</span>
          </div>

          {misconception.timeline.map((row) => (
            <div
              key={row.iteration}
              className={cn(
                "grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-line px-4 py-3 last:border-b-0",
                row.diverged && "bg-danger/[0.06]",
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="numeric text-[13px] text-fg">
                    {rowLabel} {row.iteration}
                  </span>
                  {row.diverged && (
                    <Badge tone="danger">diverged here</Badge>
                  )}
                </div>
                {row.bindings && (
                  <div className="mt-0.5 font-mono text-[12px] text-fg-subtle">{row.bindings}</div>
                )}
              </div>

              <span
                className={cn(
                  "numeric w-24 text-right font-mono text-[13px]",
                  row.studentModel === null
                    ? "text-fg-subtle"
                    : row.studentModel === row.actual
                      ? "text-fg-muted"
                      : "text-danger",
                )}
              >
                {row.studentModel ?? "—"}
              </span>

              <span className="numeric w-24 text-right font-mono text-[13px] text-fg">
                {row.actual}
              </span>
            </div>
          ))}
        </div>

        {!hasModel && (
          <p className="text-[12px] leading-relaxed text-fg-subtle">
            NOESIS could not reconstruct a specific model from this prediction, so only the real
            execution is shown. The question below narrows it down.
          </p>
        )}

        {nameMisconception && (
          <div className="rounded-md border border-line bg-raised px-4 py-3">
            <div className="label-caps mb-1.5">Likely gap</div>
            <div className="text-[13px] font-medium text-fg">
              <InlineCode text={misconception.label} />
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">
              <InlineCode text={misconception.description} />
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="primary" size="sm" onClick={onContinue}>
            Continue
            <ArrowRight size={14} aria-hidden />
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
