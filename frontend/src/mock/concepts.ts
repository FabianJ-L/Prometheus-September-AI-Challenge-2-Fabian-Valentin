import type { Concept, MasteryLevel } from "@/lib/types";

export function levelFor(mastery: number, evidenceCount: number): MasteryLevel {
  if (evidenceCount === 0) return "not_assessed";
  if (mastery >= 0.8) return "mastered";
  if (mastery >= 0.5) return "developing";
  return "uncertain";
}

/**
 * The concept map. Positions are hand-placed (not force-directed) so the graph
 * reads the same on every load — it is a diagram, not a visualisation.
 * SVG canvas is 900 × 560.
 */
export const CONCEPTS: Concept[] = [
  {
    id: "variables",
    label: "Variables",
    summary: "A name bound to a value.",
    prerequisites: [],
    mastery: 0.91,
    level: "mastered",
    evidenceCount: 14,
    recentMisconceptions: 0,
    x: 450,
    y: 62,
  },
  {
    id: "conditions",
    label: "Conditions",
    summary: "Choosing which statements run based on a boolean test.",
    prerequisites: ["variables"],
    mastery: 0.73,
    level: "developing",
    evidenceCount: 9,
    recentMisconceptions: 0,
    x: 132,
    y: 186,
  },
  {
    id: "assignment",
    label: "Assignment",
    summary:
      "`=` binds the name on the left to the value on the right, replacing any previous binding.",
    prerequisites: ["variables"],
    mastery: 0.58,
    level: "developing",
    evidenceCount: 11,
    recentMisconceptions: 2,
    x: 412,
    y: 186,
  },
  {
    id: "loops",
    label: "Loops",
    summary: "Repeating a block of statements.",
    prerequisites: ["variables"],
    mastery: 0.61,
    level: "developing",
    evidenceCount: 12,
    recentMisconceptions: 1,
    x: 726,
    y: 186,
  },
  {
    id: "accumulation",
    label: "Accumulation",
    summary:
      "Building a result across steps by combining it with its own previous value.",
    prerequisites: ["assignment"],
    mastery: 0.34,
    level: "uncertain",
    evidenceCount: 6,
    recentMisconceptions: 3,
    x: 232,
    y: 310,
  },
  {
    id: "functions",
    label: "Functions",
    summary: "A reusable, parameterised block of code that returns a value.",
    prerequisites: ["assignment"],
    mastery: 0.43,
    level: "uncertain",
    evidenceCount: 7,
    recentMisconceptions: 1,
    x: 540,
    y: 310,
  },
  {
    id: "iteration",
    label: "Iteration",
    summary: "Walking through the items of a sequence one at a time.",
    prerequisites: ["loops"],
    mastery: 0.66,
    level: "developing",
    evidenceCount: 10,
    recentMisconceptions: 1,
    x: 790,
    y: 310,
  },
  {
    id: "references",
    label: "References",
    summary:
      "Several names can point at the same object; mutating through one is visible through the others.",
    prerequisites: ["assignment", "functions"],
    mastery: 0.22,
    level: "uncertain",
    evidenceCount: 4,
    recentMisconceptions: 3,
    x: 372,
    y: 434,
  },
  {
    id: "scope",
    label: "Scope",
    summary: "Where a name is visible; function bodies have their own namespace.",
    prerequisites: ["functions"],
    mastery: 0.47,
    level: "uncertain",
    evidenceCount: 5,
    recentMisconceptions: 2,
    x: 668,
    y: 434,
  },
  {
    id: "recursion",
    label: "Recursion",
    summary: "A function defined in terms of itself, with a base case that stops it.",
    prerequisites: ["functions", "scope"],
    // No evidence yet, so no estimate — an unassessed concept shows an empty
    // meter rather than a number nothing supports.
    mastery: 0,
    level: "not_assessed",
    evidenceCount: 0,
    recentMisconceptions: 0,
    x: 668,
    y: 520,
  },
];

export const CONCEPTS_BY_ID: Record<string, Concept> = Object.fromEntries(
  CONCEPTS.map((c) => [c.id, c]),
);

export function conceptLabel(id: string): string {
  return CONCEPTS_BY_ID[id]?.label ?? id;
}

/** Prerequisite edges, as [from, to] concept-id pairs. */
export const CONCEPT_EDGES: Array<[string, string]> = CONCEPTS.flatMap((c) =>
  c.prerequisites.map((p) => [p, c.id] as [string, string]),
);
