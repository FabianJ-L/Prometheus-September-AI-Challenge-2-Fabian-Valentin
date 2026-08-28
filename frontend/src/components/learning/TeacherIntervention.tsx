"use client";

import { ArrowRight, Check, Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { InlineCode } from "@/components/learning/InlineCode";
import { maxHints, useSettings } from "@/lib/settings";
import type {
  AnswerEvaluation,
  Misconception,
  TeacherOption,
  TeacherQuestion,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The teacher's move — one intervention, not a conversation.
 *
 * There is no transcript, no message bubbles and no free-text box on purpose:
 * the student is answering a diagnostic probe about their own model, and the
 * shape of the UI should say so. The teacher never writes code here.
 */
export function TeacherIntervention({
  question,
  misconception,
  confidence,
  selectedOption,
  evaluation,
  hintsRevealed,
  pending,
  onSelect,
  onRetry,
  onRevealHint,
  onContinue,
}: {
  question: TeacherQuestion;
  misconception: Misconception | null;
  confidence: number;
  selectedOption: TeacherOption | null;
  evaluation: AnswerEvaluation | null;
  hintsRevealed: number;
  pending: boolean;
  onSelect: (option: TeacherOption) => void;
  onRetry: () => void;
  onRevealHint: () => void;
  onContinue: () => void;
}) {
  const { settings } = useSettings();
  const style = settings.teachingStyle;

  const showPreamble = style !== "socratic" && Boolean(question.preamble);
  const showPointer = style === "guided" && question.focusLine !== undefined;
  const hintBudget = maxHints(settings);
  const visibleHints = question.hints.slice(
    0,
    Math.min(hintsRevealed, hintBudget),
  );
  const canRevealHint =
    hintsRevealed < hintBudget && hintsRevealed < question.hints.length;

  const answered = evaluation !== null;
  const correct = evaluation?.correct ?? false;

  return (
    <section
      aria-label="Teacher intervention"
      className="animate-fade-up overflow-hidden rounded-lg border border-accent/25 bg-surface shadow-raised"
    >
      <header className="flex items-center gap-2 border-b border-line bg-accent/[0.05] px-4 py-2.5">
        <Mark />
        <span className="text-[12px] font-medium tracking-[0.1em] text-fg">
          NOESIS
        </span>
        <span className="ml-auto text-2xs text-fg-subtle">
          <span className="capitalize">{style}</span> mode
        </span>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,720px)_minmax(0,1fr)]">
        {/* The question is capped at a readable measure — one stretched across
            1100px is harder to answer than one you can take in at a glance. */}
        <div className="space-y-4 p-5">
          {showPreamble && (
            <p className="text-[13px] leading-relaxed text-fg-muted">
              {question.preamble}
            </p>
          )}

          {showPointer && (
            <p className="text-[13px] leading-relaxed text-fg-muted">
              Look at line{" "}
              <span className="numeric font-mono text-fg">
                {question.focusLine}
              </span>
              .
            </p>
          )}

          <p className="text-[15px] leading-relaxed text-fg">
            <InlineCode text={question.text} />
          </p>

          <div className="space-y-1 pt-1">
            {question.options.map((option) => {
              const isSelected = selectedOption?.id === option.id;
              const reveal = answered && isSelected;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={pending || correct}
                  onClick={() => onSelect(option)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-md border px-3 py-2.5 text-left transition-colors duration-150",
                    reveal && correct && "border-success/40 bg-success/[0.08]",
                    reveal && !correct && "border-danger/40 bg-danger/[0.08]",
                    !reveal &&
                      "border-line hover:border-line-strong hover:bg-raised",
                    (pending || correct) && !isSelected && "opacity-50",
                  )}
                >
                  <span
                    className={cn(
                      "mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border",
                      reveal &&
                        correct &&
                        "border-success bg-success text-accent-fg",
                      reveal &&
                        !correct &&
                        "border-danger bg-danger text-accent-fg",
                      !reveal && "border-line-strong",
                    )}
                  >
                    {reveal &&
                      (correct ? (
                        <Check size={9} aria-hidden />
                      ) : (
                        <X size={9} aria-hidden />
                      ))}
                  </span>
                  <span className="text-[13px] leading-relaxed text-fg">
                    <InlineCode text={option.label} />
                  </span>
                </button>
              );
            })}
          </div>

          {evaluation && (
            <div
              className={cn(
                "animate-fade-in rounded-md border-l-2 py-2 pl-3.5 pr-3",
                correct
                  ? "border-l-success bg-success/[0.06]"
                  : "border-l-warning bg-warning/[0.06]",
              )}
            >
              <p className="text-[13px] leading-relaxed text-fg">
                <InlineCode text={evaluation.response} />
              </p>
            </div>
          )}

          {visibleHints.length > 0 && (
            <div className="space-y-2">
              {visibleHints.map((hint, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-md bg-raised px-3 py-2"
                >
                  <Lightbulb
                    size={13}
                    className="mt-0.5 shrink-0 text-warning"
                    aria-hidden
                  />
                  <p className="text-[12px] leading-relaxed text-fg-muted">
                    <InlineCode text={hint} />
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-line pt-4">
            {settings.neverGiveSolution && (
              <span className="text-2xs text-fg-subtle">
                Solutions disabled by your AI-teacher policy
              </span>
            )}

            <div className="ml-auto flex items-center gap-2">
              {!correct && canRevealHint && (
                <Button size="sm" variant="ghost" onClick={onRevealHint}>
                  <Lightbulb size={14} aria-hidden />
                  Hint
                </Button>
              )}
              {answered && !correct && (
                <Button size="sm" onClick={onRetry}>
                  Try again
                </Button>
              )}
              {correct && (
                <Button size="sm" variant="primary" onClick={onContinue}>
                  Continue
                  <ArrowRight size={14} aria-hidden />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Why this question is being asked. Keeping the diagnosis visible next
            to the probe is the point: the student model is the product, so it
            should never be hidden behind the interaction. */}
        <aside className="hidden border-l border-line p-5 lg:block">
          <div className="label-caps mb-3">Diagnostic context</div>
          {misconception ? (
            <div className="space-y-4">
              <div>
                <div className="text-[13px] font-medium leading-snug text-fg">
                  <InlineCode text={misconception.label} />
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-fg-muted">
                  <InlineCode text={misconception.description} />
                </p>
              </div>

              <Meta
                label="Confidence"
                value={`${Math.round(confidence * 100)}%`}
              />
              {misconception.divergenceIteration !== null && (
                <Meta
                  label="First divergence"
                  value={`Iteration ${misconception.divergenceIteration}`}
                />
              )}
              <Meta
                label="Concepts probed"
                value={misconception.concepts.join(", ")}
              />
            </div>
          ) : (
            <p className="text-[12px] leading-relaxed text-fg-muted">
              No specific misconception was identified — this question narrows
              the model down.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-line pt-2.5">
      <span className="text-[12px] text-fg-subtle">{label}</span>
      <span className="numeric text-right text-[12px] capitalize text-fg">
        {value}
      </span>
    </div>
  );
}

function Mark() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle
        cx="10"
        cy="10"
        r="8.25"
        stroke="rgb(var(--accent) / 0.5)"
        strokeWidth="1.75"
      />
      <circle cx="10" cy="10" r="3.25" fill="rgb(var(--accent))" />
    </svg>
  );
}
