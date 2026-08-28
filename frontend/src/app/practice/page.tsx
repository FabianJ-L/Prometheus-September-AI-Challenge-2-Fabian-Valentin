"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { ConceptCard } from "@/components/concepts/ConceptCard";
import { Page, PageHeader, SectionTitle } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { InlineCode } from "@/components/learning/InlineCode";
import { Card, CardBody, EmptyState } from "@/components/ui/Card";
import { MasteryMeter } from "@/components/ui/ProgressBar";
import { useMentalModel } from "@/lib/mental-model";
import { pct } from "@/lib/utils";

export default function PracticePage() {
  const { concepts, recommended } = useMentalModel();
  const ranked = [...concepts].sort((a, b) => a.mastery - b.mastery);

  return (
    <Page>
      <PageHeader
        title="Practice"
        description="Strengthen the concepts that need attention. What NOESIS recommends is derived from your misconceptions, not from where you are in the course."
      />

      <section className="mt-7">
        <SectionTitle>Recommended</SectionTitle>
        {recommended ? (
          <Card className="border-accent/25">
            <CardBody className="flex flex-wrap items-end justify-between gap-6 p-6">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-1.5 text-accent">
                  <Sparkles size={13} aria-hidden />
                  <span className="text-2xs font-medium uppercase tracking-[0.09em]">
                    Adaptive suggestion
                  </span>
                </div>
                <h2 className="text-[17px] font-medium text-fg">{recommended.label}</h2>
                <p className="mt-1 max-w-lg text-[13px] leading-relaxed text-fg-muted">
                  <InlineCode text={recommended.summary} />
                </p>
                <p className="mt-2.5 text-[12px] text-fg-subtle">
                  Based on {recommended.recentMisconceptions} recent misconception
                  {recommended.recentMisconceptions === 1 ? "" : "s"} · currently at{" "}
                  <span className="numeric font-mono text-fg-muted">{pct(recommended.mastery)}</span>
                </p>
                <div className="mt-4 max-w-xs">
                  <MasteryMeter value={recommended.mastery} tone="warning" />
                </div>
              </div>
              <Link href="/learn">
                <Button variant="primary">
                  Start practice
                  <ArrowRight size={14} aria-hidden />
                </Button>
              </Link>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <EmptyState
              title="No recommendation yet"
              description="Complete a lesson in Learn. NOESIS recommends a concept once it has evidence about how you think, rather than guessing from your position in the course."
              action={
                <Link href="/learn">
                  <Button variant="primary" size="sm">
                    Start a lesson
                    <ArrowRight size={14} aria-hidden />
                  </Button>
                </Link>
              }
            />
          </Card>
        )}
      </section>

      <section className="mt-9">
        <SectionTitle>Choose a concept</SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {ranked.map((c) => (
            <ConceptCard key={c.id} concept={c} href={`/concepts?concept=${c.id}`} />
          ))}
        </div>
      </section>
    </Page>
  );
}
