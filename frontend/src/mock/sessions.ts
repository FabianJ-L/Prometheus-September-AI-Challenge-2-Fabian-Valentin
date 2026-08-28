import type { MisconceptionRecord, SessionRecord } from "@/lib/types";

/**
 * Session history. Timestamps are relative to load so "Today / Yesterday"
 * always reads correctly in a demo, whenever it is run.
 */
function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

export const SESSIONS: SessionRecord[] = [
  {
    id: "s-1",
    title: "Summing a list",
    unit: "Loops & Iteration",
    at: hoursAgo(0.13),
    durationMin: 8,
    outcome: "concept_reinforced",
    predictionAccuracy: 0.72,
    misconceptionsDetected: 1,
    misconceptionsResolved: 1,
    conceptsImproved: ["Loop iteration", "Accumulation"],
  },
  {
    id: "s-2",
    title: "What = really does",
    unit: "Variables & Assignment",
    at: hoursAgo(0.35),
    durationMin: 12,
    outcome: "misconception_resolved",
    predictionAccuracy: 0.64,
    misconceptionsDetected: 2,
    misconceptionsResolved: 1,
    conceptsImproved: ["Assignment"],
  },
  {
    id: "s-3",
    title: "Local names stay local",
    unit: "Functions & Scope",
    at: hoursAgo(26),
    durationMin: 15,
    outcome: "still_developing",
    predictionAccuracy: 0.48,
    misconceptionsDetected: 3,
    misconceptionsResolved: 1,
    conceptsImproved: ["Scope"],
  },
  {
    id: "s-4",
    title: "Aliasing a list",
    unit: "References & Mutable State",
    at: hoursAgo(30),
    durationMin: 9,
    outcome: "still_developing",
    predictionAccuracy: 0.33,
    misconceptionsDetected: 2,
    misconceptionsResolved: 0,
    conceptsImproved: [],
  },
];

export const MISCONCEPTION_HISTORY: MisconceptionRecord[] = [
  {
    id: "assignment_vs_accumulation",
    label: "Assignment vs accumulation",
    status: "resolved",
    at: hoursAgo(0.13),
    occurrences: 3,
  },
  {
    id: "loop_body_runs_once",
    label: "Loop iteration count",
    status: "improving",
    at: hoursAgo(26),
    occurrences: 2,
  },
  {
    id: "closure_over_outer_scope",
    label: "Variable scope in functions",
    status: "needs_practice",
    at: hoursAgo(30),
    occurrences: 4,
  },
  {
    id: "reference_semantics",
    label: "Reference vs value semantics",
    status: "needs_practice",
    at: hoursAgo(31),
    occurrences: 3,
  },
];

export const OUTCOME_LABEL: Record<SessionRecord["outcome"], string> = {
  misconception_resolved: "Misconception resolved",
  concept_reinforced: "Concept reinforced",
  still_developing: "Still developing",
};
