"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { MasteryMeter } from "@/components/ui/ProgressBar";
import { LEVEL_LABEL, LEVEL_TONE, useMentalModel } from "@/lib/mental-model";
import type { MisconceptionRecord } from "@/lib/types";
import { pct, shortDate } from "@/lib/utils";

const STATUS_TONE: Record<MisconceptionRecord["status"], "success" | "accent" | "warning"> = {
  resolved: "success",
  improving: "accent",
  needs_practice: "warning",
};

const STATUS_LABEL: Record<MisconceptionRecord["status"], string> = {
  resolved: "Resolved",
  improving: "Improving",
  needs_practice: "Needs practice",
};

/**
 * The mental model, read as a diagnosis: what the student understands, at what
 * confidence, on what evidence. Not a score, and deliberately not ranked.
 */
export function MentalModelPanel() {
  const { concepts } = useMentalModel();

  return (
    <Card>
      <CardHeader title="Python Fundamentals" actions={<span className="text-2xs text-fg-subtle">10 concepts</span>} />
      <CardBody className="space-y-4">
        {concepts.map((c) => (
          <Link
            key={c.id}
            href={`/concepts?concept=${c.id}`}
            className="grid grid-cols-[minmax(0,150px)_1fr_auto] items-center gap-4 rounded px-1 py-1 transition-colors hover:bg-raised"
          >
            <span className="truncate text-[13px] text-fg">{c.label}</span>
            <MasteryMeter value={c.mastery} tone={LEVEL_TONE[c.level]} />
            <span className="numeric w-24 text-right font-mono text-[12px] text-fg-muted">
              {c.evidenceCount > 0 ? pct(c.mastery) : "not assessed"}
            </span>
          </Link>
        ))}
      </CardBody>
    </Card>
  );
}

export function MisconceptionHistory({ records }: { records: MisconceptionRecord[] }) {
  return (
    <Card>
      <CardHeader title="Recent misconceptions" />
      <ul>
        {records.map((m) => (
          <li
            key={m.id}
            className="flex items-center gap-4 border-b border-line px-4 py-3 last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] text-fg">{m.label}</div>
              <div className="text-[12px] text-fg-subtle">
                Seen {m.occurrences} time{m.occurrences === 1 ? "" : "s"} · {shortDate(m.at)}
              </div>
            </div>
            <Badge tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
