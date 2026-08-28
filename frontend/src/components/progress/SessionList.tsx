"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge, Dot } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { OUTCOME_LABEL } from "@/mock/sessions";
import type { SessionOutcome, SessionRecord } from "@/lib/types";
import { clockTime, cn, pct } from "@/lib/utils";

const TONE: Record<SessionOutcome, "success" | "accent" | "warning"> = {
  misconception_resolved: "success",
  concept_reinforced: "accent",
  still_developing: "warning",
};

function dayBucket(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const days = Math.floor(
    (new Date(now.toDateString()).getTime() - new Date(then.toDateString()).getTime()) / 86_400_000,
  );
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return then.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export function SessionList({ sessions }: { sessions: SessionRecord[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const buckets = sessions.reduce<Record<string, SessionRecord[]>>((acc, s) => {
    const key = dayBucket(s.at);
    (acc[key] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(buckets).map(([day, items]) => (
        <section key={day}>
          <h3 className="label-caps mb-2.5">{day}</h3>
          <Card>
            <ul>
              {items.map((s) => {
                const open = openId === s.id;
                return (
                  <li key={s.id} className="border-b border-line last:border-b-0">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenId(open ? null : s.id)}
                      className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-raised"
                    >
                      <Dot tone={TONE[s.outcome]} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] text-fg">{s.title}</div>
                        <div className="text-[12px] text-fg-subtle">{s.unit}</div>
                      </div>
                      <span className="numeric hidden text-[12px] text-fg-subtle sm:block">
                        {clockTime(s.at)} · {s.durationMin} min
                      </span>
                      <Badge tone={TONE[s.outcome]}>{OUTCOME_LABEL[s.outcome]}</Badge>
                      <ChevronDown
                        size={14}
                        aria-hidden
                        className={cn(
                          "shrink-0 text-fg-subtle transition-transform duration-200",
                          open && "rotate-180",
                        )}
                      />
                    </button>

                    {open && (
                      <div className="animate-fade-in border-t border-line bg-raised px-4 py-4">
                        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
                          <Stat label="Prediction accuracy" value={pct(s.predictionAccuracy)} />
                          <Stat label="Detected" value={String(s.misconceptionsDetected)} />
                          <Stat
                            label="Resolved"
                            value={String(s.misconceptionsResolved)}
                            tone={s.misconceptionsResolved > 0 ? "success" : "default"}
                          />
                          <Stat label="Duration" value={`${s.durationMin} min`} />
                        </div>
                        <div className="mt-5">
                          <div className="label-caps mb-2">Concepts improved</div>
                          {s.conceptsImproved.length === 0 ? (
                            <p className="text-[12px] text-fg-subtle">
                              None — the misconception is still open.
                            </p>
                          ) : (
                            <ul className="space-y-1">
                              {s.conceptsImproved.map((c) => (
                                <li key={c} className="flex items-center gap-2 text-[13px] text-fg">
                                  <Dot tone="success" />
                                  {c}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>
      ))}
    </div>
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
      <div className="label-caps mb-1">{label}</div>
      <div
        className={cn(
          "numeric font-mono text-lg font-medium leading-none",
          tone === "success" ? "text-success" : "text-fg",
        )}
      >
        {value}
      </div>
    </div>
  );
}
