"use client";

import Link from "next/link";
import { ArrowRight, RotateCcw, Target } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { InlineCode } from "@/components/learning/InlineCode";
import type { ConceptUpdate } from "@/lib/types";
import { pct } from "@/lib/utils";

/**
 * Between identifying the misconception and re-testing it. The claim being
 * made here is narrow on purpose: the student named the gap. Whether they have
 * closed it is not yet known — that is what the retest is for.
 */
export function UnderstoodPanel({
  misconceptionLabel,
  hasRetest,
  onRetest,
}: {
  misconceptionLabel: string | null;
  hasRetest: boolean;
  onRetest: () => void;
}) {
  return (
    <Card className="animate-fade-up border-accent/25">
      <CardBody className="space-y-4">
        <div>
          <h3 className="text-[15px] font-medium text-fg">You identified the misconception.</h3>
          {misconceptionLabel && (
            <p className="mt-1 text-[13px] text-fg-muted">
              <InlineCode text={misconceptionLabel} />
            </p>
          )}
        </div>

        <p className="text-[13px] leading-relaxed text-fg-muted">
          Naming a gap is not the same as closing it. NOESIS re-tests the same concept on code you
          have not seen before — if the model really changed, the prediction will change with it.
        </p>

        <div className="flex justify-end">
          {hasRetest ? (
            <Button variant="primary" size="sm" onClick={onRetest}>
              <RotateCcw size={14} aria-hidden />
              Test my understanding
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={onRetest}>
              Continue
              <ArrowRight size={14} aria-hidden />
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

/** Session closed: what moved in the student model, and where to go next. */
export function CompletePanel({
  updates,
  resolvedMisconceptionLabel,
  predictionAccuracy,
  onRestart,
}: {
  updates: ConceptUpdate[];
  resolvedMisconceptionLabel: string | null;
  predictionAccuracy: number;
  onRestart: () => void;
}) {
  return (
    <Card className="animate-fade-up border-success/25">
      <CardHeader title="Session summary" />
      <CardBody className="space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Prediction accuracy" value={pct(predictionAccuracy)} />
          <Stat label="Misconceptions detected" value={resolvedMisconceptionLabel ? "1" : "0"} />
          <Stat
            label="Misconceptions resolved"
            value={resolvedMisconceptionLabel ? "1" : "0"}
            tone="success"
          />
        </div>

        {resolvedMisconceptionLabel && (
          <div className="rounded-md border border-line bg-raised px-4 py-3">
            <div className="label-caps mb-1">Resolved</div>
            <p className="text-[13px] text-fg">
              <InlineCode text={resolvedMisconceptionLabel} />
            </p>
          </div>
        )}

        {updates.length > 0 && (
          <div>
            <div className="label-caps mb-3">Mental model updated</div>
            <div className="space-y-3">
              {updates.map((u) => (
                <div key={u.conceptId} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] text-fg">{u.label}</span>
                    <span className="numeric font-mono text-[12px]">
                      <span className="text-fg-subtle">{pct(u.from)}</span>
                      <span className="mx-1 text-fg-subtle" aria-hidden>
                        →
                      </span>
                      <span className="text-success">{pct(u.to)}</span>
                    </span>
                  </div>
                  <ProgressBar value={u.to} tone="success" size="sm" label={u.label} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
          <Button size="sm" variant="ghost" onClick={onRestart}>
            <RotateCcw size={14} aria-hidden />
            Run again
          </Button>
          <Link href="/practice">
            <Button size="sm">
              <Target size={14} aria-hidden />
              Practice this concept
            </Button>
          </Link>
          <Link href="/progress">
            <Button size="sm" variant="primary">
              View mental model
              <ArrowRight size={14} aria-hidden />
            </Button>
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success";
}) {
  return (
    <div>
      <div className="label-caps mb-1.5">{label}</div>
      <div
        className={`numeric font-mono text-2xl font-medium leading-none ${
          tone === "success" ? "text-success" : "text-fg"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
