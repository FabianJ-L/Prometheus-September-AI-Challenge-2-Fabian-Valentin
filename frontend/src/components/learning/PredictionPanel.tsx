"use client";

import { useState } from "react";
import { ArrowRight, Check, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { InlineCode } from "@/components/learning/InlineCode";

/**
 * The commitment step. The student cannot see execution until they have
 * written down what they believe will happen — that written belief is the
 * signal everything downstream is built on.
 */
export function PredictionPanel({
  prompt,
  target,
  prediction,
  onSubmit,
  onExecute,
  attempt,
}: {
  prompt: string;
  target: string;
  /** Non-null once recorded. */
  prediction: string | null;
  onSubmit: (value: string) => void;
  onExecute: () => void;
  attempt: number;
}) {
  const [draft, setDraft] = useState("");
  const recorded = prediction !== null;

  return (
    <Card className="animate-fade-up">
      <CardHeader
        title="Your prediction"
        actions={
          attempt > 1 ? (
            <span className="text-2xs text-fg-subtle">Attempt {attempt}</span>
          ) : undefined
        }
      />
      <CardBody className="space-y-4">
        {recorded ? (
          <>
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-mono text-[13px] text-fg-muted">{target}</span>
              <span className="numeric font-mono text-3xl font-medium leading-none text-fg">
                {prediction}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] text-success">
              <Check size={13} aria-hidden />
              Prediction recorded
            </div>
            <Button variant="primary" size="md" className="w-full" onClick={onExecute}>
              <Play size={14} aria-hidden />
              Execute program
            </Button>
          </>
        ) : (
          <>
            <p className="text-[13px] leading-relaxed text-fg">
              <InlineCode text={prompt} />
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (draft.trim()) onSubmit(draft);
              }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 rounded-md border border-line bg-bg px-3 focus-within:border-accent">
                <span className="font-mono text-[13px] text-fg-subtle">{target} =</span>
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  aria-label={`Predicted value of ${target}`}
                  placeholder="?"
                  className="numeric h-11 min-w-0 flex-1 bg-transparent font-mono text-lg text-fg outline-none placeholder:text-fg-subtle/50"
                />
              </div>
              <Button type="submit" variant="primary" className="w-full" disabled={!draft.trim()}>
                Submit prediction
                <ArrowRight size={14} aria-hidden />
              </Button>
            </form>
            <p className="text-[12px] leading-relaxed text-fg-subtle">
              Commit to an answer before running. NOESIS compares your model against the real
              execution — a wrong prediction is more useful than no prediction.
            </p>
          </>
        )}
      </CardBody>
    </Card>
  );
}
