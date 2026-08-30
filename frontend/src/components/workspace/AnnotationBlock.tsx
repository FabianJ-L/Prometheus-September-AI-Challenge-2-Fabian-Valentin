"use client";

import { Bot, Cpu, X } from "lucide-react";
import { Markdown } from "@/components/ui/Markdown";
import { MemoryDiagram } from "@/components/workspace/MemoryDiagram";
import { cn } from "@/lib/utils";
import type { ResolvedAnnotation } from "@/lib/annotations";
import type { Heap, TraceValue } from "@/lib/types";

/**
 * The contents of an in-editor block annotation: a written note, or a memory
 * diagram.
 *
 * Authorship is stated, not implied. A measured block says the trace observed
 * this; an AI block says the assistant thinks this. Same surface, different
 * claim — and a student who cannot tell the two apart has no way to know which
 * one to double-check.
 */
export function AnnotationBlock({
  annotation,
  bindings,
  heap,
  onDismiss,
}: {
  annotation: ResolvedAnnotation;
  bindings: Record<string, TraceValue>;
  heap: Heap;
  onDismiss: () => void;
}) {
  const fromAI = annotation.source === "ai";
  const Icon = fromAI ? Bot : Cpu;

  return (
    <div
      className={cn(
        "noesis-zone-card",
        fromAI ? "noesis-zone-card--ai" : "noesis-zone-card--measured",
        annotation.stale && "noesis-zone-card--stale",
      )}
    >
      <div className="flex items-center gap-1.5 pb-1.5">
        <Icon size={11} className={fromAI ? "text-accent" : "text-success"} />
        <span
          className={cn(
            "text-2xs font-medium uppercase tracking-[0.09em]",
            fromAI ? "text-accent" : "text-success",
          )}
        >
          {fromAI ? "NOESIS meint" : "Aus dem Lauf gemessen"}
        </span>
        {annotation.stale && (
          <span className="text-2xs uppercase tracking-[0.09em] text-warning">
            · Code hat sich geändert
          </span>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Annotation ausblenden"
          className="ml-auto -mr-1 flex h-5 w-5 items-center justify-center rounded text-fg-subtle transition-colors hover:bg-raised hover:text-fg"
        >
          <X size={11} />
        </button>
      </div>

      {annotation.kind === "memory" ? (
        <MemoryDiagram bindings={bindings} heap={heap} focus={annotation.variables} />
      ) : (
        <Markdown
          text={annotation.body ?? annotation.label ?? ""}
          className="text-[12.5px] leading-relaxed text-fg-muted"
        />
      )}
    </div>
  );
}
