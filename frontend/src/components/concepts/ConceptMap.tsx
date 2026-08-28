"use client";

import { LEVEL_LABEL, LEVEL_TONE } from "@/lib/mental-model";
import type { Concept, MasteryLevel } from "@/lib/types";
import { CONCEPT_EDGES } from "@/mock/concepts";
import { cn } from "@/lib/utils";

const NODE_W = 132;
const NODE_H = 44;

const STROKE: Record<MasteryLevel, string> = {
  mastered: "rgb(var(--success))",
  developing: "rgb(var(--accent))",
  uncertain: "rgb(var(--warning))",
  not_assessed: "rgb(var(--line-strong))",
};

const FILL: Record<MasteryLevel, string> = {
  mastered: "rgb(var(--success) / 0.10)",
  developing: "rgb(var(--accent) / 0.10)",
  uncertain: "rgb(var(--warning) / 0.10)",
  not_assessed: "rgb(var(--raised))",
};

/**
 * The concept graph, drawn from the prerequisite edges. Node positions are
 * fixed in the data so the map is a stable diagram the student can learn the
 * shape of, rather than a layout that reshuffles on every visit.
 */
export function ConceptMap({
  concepts,
  selectedId,
  onSelect,
}: {
  concepts: Concept[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const byId = Object.fromEntries(concepts.map((c) => [c.id, c]));

  return (
    <svg
      viewBox="0 0 900 580"
      className="h-auto w-full"
      role="group"
      aria-label="Concept map"
      preserveAspectRatio="xMidYMin meet"
    >
      <g aria-hidden>
        {CONCEPT_EDGES.map(([fromId, toId]) => {
          const from = byId[fromId];
          const to = byId[toId];
          if (!from || !to) return null;
          const highlighted =
            selectedId === fromId || selectedId === toId;
          const x1 = from.x;
          const y1 = from.y + NODE_H / 2;
          const x2 = to.x;
          const y2 = to.y - NODE_H / 2;
          const midY = (y1 + y2) / 2;
          return (
            <path
              key={`${fromId}-${toId}`}
              d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
              fill="none"
              stroke={highlighted ? "rgb(var(--accent))" : "rgb(var(--line-strong))"}
              strokeWidth={highlighted ? 1.5 : 1}
              className="transition-[stroke,stroke-width] duration-200"
            />
          );
        })}
      </g>

      {concepts.map((c) => {
        const selected = selectedId === c.id;
        const tone = LEVEL_TONE[c.level];
        return (
          <g
            key={c.id}
            role="button"
            tabIndex={0}
            aria-label={`${c.label}, ${LEVEL_LABEL[c.level]}`}
            aria-pressed={selected}
            onClick={() => onSelect(c.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(c.id);
              }
            }}
            className="cursor-pointer outline-none"
          >
            <rect
              x={c.x - NODE_W / 2}
              y={c.y - NODE_H / 2}
              width={NODE_W}
              height={NODE_H}
              rx={7}
              fill={selected ? "rgb(var(--surface))" : FILL[c.level]}
              stroke={selected ? "rgb(var(--accent))" : STROKE[c.level]}
              strokeWidth={selected ? 1.75 : 1}
              className="transition-[stroke,stroke-width,fill] duration-200"
            />

            <text
              x={c.x}
              y={c.y - 2}
              textAnchor="middle"
              className="pointer-events-none select-none fill-[rgb(var(--fg))] text-[12px] font-medium"
            >
              {c.label}
            </text>

            {/* Mastery bar inside the node — the status is part of the node. */}
            <rect
              x={c.x - NODE_W / 2 + 14}
              y={c.y + 8}
              width={NODE_W - 28}
              height={3}
              rx={1.5}
              fill="rgb(var(--line))"
            />
            <rect
              x={c.x - NODE_W / 2 + 14}
              y={c.y + 8}
              width={(NODE_W - 28) * Math.max(0.02, c.mastery)}
              height={3}
              rx={1.5}
              fill={STROKE[c.level]}
              className="transition-[width] duration-500"
            />

            <title>{`${c.label} — ${LEVEL_LABEL[c.level]}`}</title>
            <desc>{tone}</desc>
          </g>
        );
      })}
    </svg>
  );
}

export function MapLegend({ className }: { className?: string }) {
  const levels: MasteryLevel[] = ["mastered", "developing", "uncertain", "not_assessed"];
  return (
    <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-2", className)}>
      {levels.map((level) => (
        <span key={level} className="flex items-center gap-1.5 text-[12px] text-fg-muted">
          <span
            className="h-2 w-2 rounded-sm"
            style={{ backgroundColor: STROKE[level] }}
            aria-hidden
          />
          {LEVEL_LABEL[level]}
        </span>
      ))}
    </div>
  );
}
