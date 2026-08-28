"use client";

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Page, SectionTitle } from "@/components/layout/PageHeader";
import { ConceptCard } from "@/components/concepts/ConceptCard";
import { Badge, Dot } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useMentalModel } from "@/lib/mental-model";
import { getLesson } from "@/mock/lessons";
import { OUTCOME_LABEL, SESSIONS } from "@/mock/sessions";
import { relativeTime } from "@/lib/utils";
import type { SessionOutcome } from "@/lib/types";

const OUTCOME_TONE: Record<SessionOutcome, "success" | "accent" | "warning"> = {
  misconception_resolved: "success",
  concept_reinforced: "accent",
  still_developing: "warning",
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning.";
  if (h < 18) return "Good afternoon.";
  return "Good evening.";
}

export default function Dashboard() {
  const { concepts } = useMentalModel();
  const lesson = getLesson("loops-sum");

  // Unit progress = how far through the unit's lessons the student is.
  const unitProgress = (lesson.index - 1) / lesson.total;

  return (
    <Page>
      <header>
        <h1 className="text-[22px] font-medium tracking-[-0.015em] text-fg">{greeting()}</h1>
        <p className="mt-1 text-[13px] text-fg-muted">Continue where you left off.</p>
      </header>

      <Card className="mt-7">
        <CardBody className="flex flex-wrap items-end justify-between gap-6 p-6">
          <div className="min-w-0 flex-1">
            <div className="label-caps mb-2">{lesson.track}</div>
            <h2 className="text-[17px] font-medium text-fg">{lesson.unit}</h2>
            <p className="mt-1 text-[13px] text-fg-muted">
              Next: {lesson.title} · lesson {lesson.index} of {lesson.total}
            </p>
            <div className="mt-4 flex max-w-sm items-center gap-3">
              <ProgressBar value={unitProgress} label={lesson.unit} />
              <span className="numeric shrink-0 font-mono text-[12px] text-fg-muted">
                {Math.round(unitProgress * 100)}%
              </span>
            </div>
          </div>
          <Link href="/learn">
            <Button variant="primary">
              Continue
              <ArrowRight size={14} aria-hidden />
            </Button>
          </Link>
        </CardBody>
      </Card>

      <section className="mt-9">
        <SectionTitle
          actions={
            <Link
              href="/concepts"
              className="flex items-center gap-1 text-[12px] text-fg-muted transition-colors hover:text-fg"
            >
              Concept map
              <ArrowRight size={12} aria-hidden />
            </Link>
          }
        >
          Your concepts
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {concepts.slice(0, 4).map((c) => (
            <ConceptCard key={c.id} concept={c} href={`/concepts?concept=${c.id}`} />
          ))}
        </div>
      </section>

      <section className="mt-9">
        <SectionTitle
          actions={
            <Link
              href="/progress"
              className="flex items-center gap-1 text-[12px] text-fg-muted transition-colors hover:text-fg"
            >
              All sessions
              <ArrowRight size={12} aria-hidden />
            </Link>
          }
        >
          Recent sessions
        </SectionTitle>
        <Card>
          <ul>
            {SESSIONS.slice(0, 3).map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-4 border-b border-line px-4 py-3 last:border-b-0"
              >
                <Dot tone={OUTCOME_TONE[s.outcome]} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-fg">{s.title}</div>
                  <div className="text-[12px] text-fg-subtle">{s.unit}</div>
                </div>
                <span className="hidden items-center gap-1.5 text-[12px] text-fg-subtle sm:flex">
                  <Clock size={12} aria-hidden />
                  {relativeTime(s.at)}
                </span>
                <Badge tone={OUTCOME_TONE[s.outcome]}>{OUTCOME_LABEL[s.outcome]}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </Page>
  );
}
