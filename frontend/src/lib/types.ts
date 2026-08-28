/**
 * NOESIS domain types.
 *
 * These are the contract between the UI and whatever produces the teaching
 * signal — today a deterministic local model (`lib/teacher.ts` → mock), later a
 * backend / LLM. No component may branch on where a `Diagnosis` came from.
 */

// ---------------------------------------------------------------------------
// Concepts
// ---------------------------------------------------------------------------

export type MasteryLevel = "mastered" | "developing" | "uncertain" | "not_assessed";

export interface Concept {
  id: string;
  label: string;
  summary: string;
  prerequisites: string[];
  /** 0..1 */
  mastery: number;
  level: MasteryLevel;
  evidenceCount: number;
  recentMisconceptions: number;
  /** Fixed position in the concept map, in SVG user units. */
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Lessons & execution
// ---------------------------------------------------------------------------

export interface Lesson {
  id: string;
  track: string;
  unit: string;
  title: string;
  /** 1-based position within the unit, for the progress rail. */
  index: number;
  total: number;
  concepts: string[];
  code: string;
  /** e.g. "What will `total` be?" */
  predictionPrompt: string;
  /** Variable the student is predicting. */
  predictionTarget: string;
  /** Ground truth, as displayed. */
  actual: string;
  steps: ExecutionStep[];
  /** Set when this lesson exists to re-test a concept after a diagnosis. */
  retestOf?: string;
}

export interface VariableBinding {
  name: string;
  value: string;
  previous?: string;
  changed: boolean;
}

export interface ExecutionStep {
  index: number;
  /** 1-based line in `Lesson.code`. */
  line: number;
  label: string;
  /** 1-based loop iteration, or null outside a loop. */
  iteration: number | null;
  scope: VariableBinding[];
  stdout: string[];
  callStack: string[];
}

// ---------------------------------------------------------------------------
// Diagnosis
// ---------------------------------------------------------------------------

export interface Comparison {
  target: string;
  predicted: string;
  actual: string;
  matches: boolean;
}

export interface IterationRow {
  iteration: number;
  bindings: string;
  actual: string;
  /** What the student's implied model produces, when it can be reconstructed. */
  studentModel: string | null;
  diverged: boolean;
}

export interface Misconception {
  id: string;
  label: string;
  description: string;
  concepts: string[];
  /** Iteration-by-iteration replay of prediction vs reality. */
  timeline: IterationRow[];
  divergenceIteration: number | null;
}

export interface TeacherOption {
  id: string;
  label: string;
  correct: boolean;
  /** Shown after the student picks this option. */
  response: string;
}

export interface TeacherQuestion {
  id: string;
  /** Only rendered under teaching styles that allow framing. */
  preamble?: string;
  /** Line to point the student at, when the style allows a pointer. */
  focusLine?: number;
  text: string;
  options: TeacherOption[];
  /** Progressive hints: concept → strategy → steps. */
  hints: string[];
}

export interface ConceptUpdate {
  conceptId: string;
  label: string;
  from: number;
  to: number;
}

export interface Diagnosis {
  comparison: Comparison;
  misconception: Misconception | null;
  question: TeacherQuestion | null;
  /** 0..1 */
  confidence: number;
  conceptUpdates: ConceptUpdate[];
  /** Which lesson re-tests the same concept, if a retest is warranted. */
  retestLessonId: string | null;
}

export interface AnswerEvaluation {
  correct: boolean;
  response: string;
  /** Next hint to reveal when the answer was wrong, if any remain. */
  nextHint: string | null;
}

// ---------------------------------------------------------------------------
// Session history
// ---------------------------------------------------------------------------

export type SessionOutcome =
  | "misconception_resolved"
  | "concept_reinforced"
  | "still_developing";

export interface SessionRecord {
  id: string;
  title: string;
  unit: string;
  at: string;
  durationMin: number;
  outcome: SessionOutcome;
  predictionAccuracy: number;
  misconceptionsDetected: number;
  misconceptionsResolved: number;
  conceptsImproved: string[];
}

export interface MisconceptionRecord {
  id: string;
  label: string;
  status: "resolved" | "improving" | "needs_practice";
  at: string;
  occurrences: number;
}
