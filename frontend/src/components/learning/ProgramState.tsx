"use client";

import { Layers, Terminal } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { useSettings } from "@/lib/settings";
import type { ExecutionStep } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The debugger's variable pane. A value that just changed shows where it came
 * from (`6 → 12`) — that transition is the thing students misread, so it is
 * rendered explicitly rather than animated away.
 */
export function ProgramState({
  step,
  className,
}: {
  step: ExecutionStep | undefined;
  className?: string;
}) {
  const { settings } = useSettings();

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader
        title="Program state"
        actions={
          step ? (
            <span className="numeric text-2xs text-fg-subtle">
              line {step.line}
              {step.iteration !== null && ` · iteration ${step.iteration}`}
            </span>
          ) : undefined
        }
      />
      <CardBody className="flex-1 space-y-5">
        {!step ? (
          <p className="py-6 text-center text-[13px] text-fg-subtle">
            Submit a prediction, then execute to inspect state.
          </p>
        ) : (
          <>
            {settings.showMemory && (
              <div className="space-y-px">
                {step.scope.length === 0 ? (
                  <p className="text-[13px] text-fg-subtle">No bindings yet.</p>
                ) : (
                  step.scope.map((binding) => (
                    <div
                      key={binding.name}
                      className={cn(
                        "flex items-baseline justify-between gap-4 rounded px-2 py-1.5",
                        binding.changed && "animate-value-flash",
                      )}
                    >
                      <span className="font-mono text-[13px] text-fg-muted">{binding.name}</span>
                      <span className="flex items-baseline gap-1.5 font-mono text-[13px]">
                        {binding.changed && binding.previous !== undefined && (
                          <>
                            <span className="numeric text-fg-subtle line-through decoration-fg-subtle/40">
                              {binding.previous}
                            </span>
                            <span className="text-fg-subtle" aria-hidden>
                              →
                            </span>
                          </>
                        )}
                        <span
                          className={cn(
                            "numeric",
                            binding.changed ? "font-medium text-accent" : "text-fg",
                          )}
                        >
                          {binding.value}
                        </span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {settings.showCallStack && (
              <Section icon={<Layers size={12} />} title="Call stack">
                {step.callStack.map((frame, i) => (
                  <div key={i} className="font-mono text-[12px] text-fg-muted">
                    {frame}
                  </div>
                ))}
              </Section>
            )}

            <Section icon={<Terminal size={12} />} title="Output">
              {step.stdout.length === 0 ? (
                <span className="text-[12px] text-fg-subtle">—</span>
              ) : (
                step.stdout.map((out, i) => (
                  <div key={i} className="font-mono text-[13px] text-fg">
                    {out}
                  </div>
                ))
              )}
            </Section>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-line pt-3.5">
      <div className="label-caps mb-2 flex items-center gap-1.5">
        <span aria-hidden className="text-fg-subtle">
          {icon}
        </span>
        {title}
      </div>
      <div className="space-y-0.5 pl-0.5">{children}</div>
    </div>
  );
}
