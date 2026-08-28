// Mirror of backend/app/models/schemas.py — keep in sync.

export type MasteryLevel = "mastered" | "developing" | "uncertain" | "not_assessed";
export type PredictionKind = "value" | "output" | "choice";
export type SessionPhase =
  | "predict"
  | "execute"
  | "compare"
  | "diagnose"
  | "understand"
  | "retry"
  | "done";

export interface ConceptNode {
  id: string;
  label: string;
  summary: string;
  prerequisites: string[];
}

export interface ConceptState {
  concept_id: string;
  score: number;
  level: MasteryLevel;
  evidence_count: number;
  last_updated: string;
}

export interface Lesson {
  id: string;
  track: string;
  unit: string;
  title: string;
  order: number;
  concepts: string[];
  starter_code: string;
  prediction_kind: PredictionKind;
  prediction_prompt: string;
  prediction_target: string | null;
  choices: string[];
  expected_answer: unknown;
}

export interface TraceStep {
  step: number;
  line: number;
  source: string;
  event: string;
  locals: Record<string, unknown>;
  stdout: string;
}

export interface ExecutionTrace {
  lesson_id: string;
  steps: TraceStep[];
  final_locals: Record<string, unknown>;
  stdout: string;
  error: string | null;
  truncated: boolean;
}

export interface PredictionCheck {
  matches: boolean;
  predicted: unknown;
  actual: unknown;
  divergence_step: number | null;
  note: string;
}

export interface Misconception {
  id: string;
  label: string;
  description: string;
  related_concepts: string[];
}

export interface SocraticTurn {
  role: "teacher" | "student";
  intent: "question" | "hint" | "prompt" | "confirm";
  text: string;
  choices: string[];
  reveals_solution: boolean;
  created_at: string;
}

export interface DiagnosticResult {
  lesson_id: string;
  prediction_check: PredictionCheck;
  misconception: Misconception | null;
  confidence: number;
  concept_deltas: Record<string, number>;
  first_turn: SocraticTurn | null;
  mock: boolean;
}

export interface SessionState {
  id: string;
  lesson_id: string;
  phase: SessionPhase;
  started_at: string;
  prediction: { lesson_id: string; kind: PredictionKind; answer: unknown; rationale: string | null } | null;
  trace: ExecutionTrace | null;
  diagnostic: DiagnosticResult | null;
  turns: SocraticTurn[];
  concept_states: Record<string, ConceptState>;
  prediction_accuracy: number | null;
}
