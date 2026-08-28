"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { MasteryMeter } from "@/components/ui/ProgressBar";
import { LEVEL_LABEL, LEVEL_TONE } from "@/lib/mental-model";
import type { Concept } from "@/lib/types";
import { cn, pct } from "@/lib/utils";

export function ConceptCard({
  concept,
  href,
  onClick,
  selected = false,
}: {
  concept: Concept;
  href?: string;
  onClick?: () => void;
  selected?: boolean;
}) {
  const tone = LEVEL_TONE[concept.level];
  const body = (
    <div
      className={cn(
        "flex h-full flex-col justify-between gap-4 rounded-lg border bg-surface p-4 text-left transition-[border-color,background-color] duration-150",
        selected ? "border-accent/50 bg-raised" : "border-line hover:border-line-strong hover:bg-raised",
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <span className="text-[13px] font-medium text-fg">{concept.label}</span>
          <span className="numeric font-mono text-[13px] text-fg-muted">
            {concept.evidenceCount > 0 ? pct(concept.mastery) : "—"}
          </span>
        </div>
        {concept.recentMisconceptions > 0 && (
          <p className="mt-1 text-[11px] text-fg-subtle">
            {concept.recentMisconceptions} recent misconception
            {concept.recentMisconceptions === 1 ? "" : "s"}
          </p>
        )}
      </div>

      <div className="space-y-2.5">
        <MasteryMeter value={concept.mastery} tone={tone} />
        <Badge tone={tone}>{LEVEL_LABEL[concept.level]}</Badge>
      </div>
    </div>
  );

  if (href) return <Link href={href} className="block h-full">{body}</Link>;
  return (
    <button type="button" onClick={onClick} className="block h-full w-full">
      {body}
    </button>
  );
}
