"use client";

import { ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import type { Comparison } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The moment the product exists for: the student's model set side by side with
 * what the machine actually did. Semantic colour only — a divergence is
 * information, not an alarm.
 */
export function CompareView({
  comparison,
  onContinue,
}: {
  comparison: Comparison;
  onContinue: () => void;
}) {
  const { matches, predicted, actual, target } = comparison;

  return (
    <Card className="animate-fade-up overflow-hidden">
      <CardBody className="p-0">
        <div className="grid grid-cols-2 divide-x divide-line">
          <Column
            label="Your model"
            value={predicted}
            target={target}
            tone={matches ? "success" : "danger"}
            icon={matches ? <Check size={14} /> : <X size={14} />}
          />
          <Column label="Actual" value={actual} target={target} tone="neutral" />
        </div>

        <div
          className={cn(
            "flex items-center justify-between gap-4 border-t px-5 py-4",
            matches ? "border-success/20 bg-success/[0.06]" : "border-danger/20 bg-danger/[0.06]",
          )}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                matches ? "bg-success/15 text-success" : "bg-danger/15 text-danger",
              )}
            >
              {matches ? <Check size={13} aria-hidden /> : <X size={13} aria-hidden />}
            </span>
            <div>
              <div
                className={cn(
                  "text-[13px] font-medium tracking-[0.02em]",
                  matches ? "text-success" : "text-danger",
                )}
              >
                {matches ? "Model confirmed" : "Mental model diverged"}
              </div>
              <p className="mt-0.5 text-[12px] text-fg-muted">
                {matches
                  ? "Your prediction matched execution exactly."
                  : "Your prediction and the execution parted ways. Let's find where."}
              </p>
            </div>
          </div>

          <Button variant="primary" size="sm" onClick={onContinue}>
            {matches ? "Continue" : "Find the divergence"}
            <ArrowRight size={14} aria-hidden />
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function Column({
  label,
  value,
  target,
  tone,
  icon,
}: {
  label: string;
  value: string;
  target: string;
  tone: "success" | "danger" | "neutral";
  icon?: React.ReactNode;
}) {
  const colour =
    tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-fg";
  return (
    <div className="px-5 py-6">
      <div className="label-caps mb-3 flex items-center gap-1.5">
        {label}
        {icon && <span className={colour}>{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[13px] text-fg-subtle">{target}</span>
        <span className={cn("numeric font-mono text-4xl font-medium leading-none", colour)}>
          {value}
        </span>
      </div>
    </div>
  );
}
