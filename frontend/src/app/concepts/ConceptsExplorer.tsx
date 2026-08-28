"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ConceptMap, MapLegend } from "@/components/concepts/ConceptMap";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InlineCode } from "@/components/learning/InlineCode";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/Card";
import { MasteryMeter } from "@/components/ui/ProgressBar";
import { LEVEL_LABEL, LEVEL_TONE, useMentalModel } from "@/lib/mental-model";
import { pct } from "@/lib/utils";

export function ConceptsExplorer({ initialConcept }: { initialConcept: string | null }) {
  const { concepts, byId } = useMentalModel();
  const [selectedId, setSelectedId] = useState<string | null>(initialConcept);
  const selected = selectedId ? byId[selectedId] : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <Card className="overflow-hidden">
        <CardHeader title="Prerequisite graph" actions={<MapLegend />} />
        <CardBody className="overflow-x-auto p-5">
          <div className="min-w-[720px]">
            <ConceptMap concepts={concepts} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
        </CardBody>
      </Card>

      <Card className="h-fit lg:sticky lg:top-10">
        {selected ? (
          <>
            <CardHeader title="Concept" />
            <CardBody className="space-y-5">
              <div>
                <h2 className="text-[15px] font-medium text-fg">{selected.label}</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
                  <InlineCode text={selected.summary} />
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="label-caps">Understanding</span>
                  <span className="numeric font-mono text-lg text-fg">
                    {selected.evidenceCount > 0 ? pct(selected.mastery) : "—"}
                  </span>
                </div>
                <MasteryMeter value={selected.mastery} tone={LEVEL_TONE[selected.level]} />
                <Badge tone={LEVEL_TONE[selected.level]}>{LEVEL_LABEL[selected.level]}</Badge>
              </div>

              <dl className="space-y-3 border-t border-line pt-4">
                <Row label="Evidence" value={`${selected.evidenceCount} observations`} />
                <Row
                  label="Recent misconceptions"
                  value={String(selected.recentMisconceptions)}
                  tone={selected.recentMisconceptions > 0 ? "warning" : "default"}
                />
                <Row
                  label="Requires"
                  value={
                    selected.prerequisites.length === 0
                      ? "Nothing — entry point"
                      : selected.prerequisites.map((p) => byId[p]?.label ?? p).join(", ")
                  }
                />
              </dl>

              <Link href="/learn" className="block">
                <Button variant="primary" size="sm" className="w-full">
                  Practice this concept
                  <ArrowRight size={14} aria-hidden />
                </Button>
              </Link>
            </CardBody>
          </>
        ) : (
          <EmptyState
            title="Select a concept"
            description="Every node carries its own mastery estimate and the evidence behind it. Click one to inspect what NOESIS believes you understand."
          />
        )}
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-[12px] text-fg-subtle">{label}</dt>
      <dd
        className={`max-w-[60%] text-right text-[12px] ${
          tone === "warning" ? "text-warning" : "text-fg"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
