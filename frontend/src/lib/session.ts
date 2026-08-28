/**
 * The learning session state machine.
 *
 *   predict → predicted → executing → compare
 *      ├─ match ──────────────────────────────────────────────► complete
 *      └─ diverged → diagnose → teach → understood → (retest) → predict …
 *
 * Every phase has at least one forward action, so the student can never reach a
 * dead end.
 */

import type {
  AnswerEvaluation,
  Diagnosis,
  Lesson,
  TeacherOption,
} from "@/lib/types";

export type Phase =
  | "predict"
  | "predicted"
  | "executing"
  | "compare"
  | "diagnose"
  | "teach"
  | "understood"
  | "complete";

export interface SessionState {
  lesson: Lesson;
  attempt: number;
  phase: Phase;
  prediction: string | null;
  currentStep: number;
  diagnosis: Diagnosis | null;
  selectedOption: TeacherOption | null;
  evaluation: AnswerEvaluation | null;
  hintsRevealed: number;
  /** Set once the loop closes, so the summary can name what moved. */
  resolvedMisconceptionLabel: string | null;
  pending: boolean;
}

export type SessionAction =
  | { type: "start"; lesson: Lesson; attempt: number; resolvedMisconceptionLabel?: string | null }
  | { type: "submitPrediction"; prediction: string }
  | { type: "diagnosed"; diagnosis: Diagnosis }
  | { type: "beginExecution" }
  | { type: "stepTo"; index: number }
  | { type: "nextStep" }
  | { type: "previousStep" }
  | { type: "runToEnd" }
  | { type: "showComparison" }
  | { type: "showDiagnosis" }
  | { type: "showQuestion" }
  | { type: "selectOption"; option: TeacherOption }
  | { type: "evaluated"; evaluation: AnswerEvaluation }
  | { type: "revealHint" }
  | { type: "clearSelection" }
  | { type: "acknowledgeUnderstanding" }
  | { type: "finish" };

export function initSession(lesson: Lesson, attempt = 1): SessionState {
  return {
    lesson,
    attempt,
    phase: "predict",
    prediction: null,
    currentStep: 0,
    diagnosis: null,
    selectedOption: null,
    evaluation: null,
    hintsRevealed: 0,
    resolvedMisconceptionLabel: null,
    pending: false,
  };
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "start":
      return {
        ...initSession(action.lesson, action.attempt),
        resolvedMisconceptionLabel:
          action.resolvedMisconceptionLabel ?? state.resolvedMisconceptionLabel,
      };

    case "submitPrediction":
      return { ...state, prediction: action.prediction, phase: "predicted", pending: true };

    case "diagnosed":
      return { ...state, diagnosis: action.diagnosis, pending: false };

    case "beginExecution":
      return { ...state, phase: "executing", currentStep: 0 };

    case "stepTo":
      return {
        ...state,
        currentStep: clamp(action.index, 0, state.lesson.steps.length - 1),
      };

    case "nextStep":
      return {
        ...state,
        currentStep: clamp(state.currentStep + 1, 0, state.lesson.steps.length - 1),
      };

    case "previousStep":
      return { ...state, currentStep: clamp(state.currentStep - 1, 0, state.lesson.steps.length - 1) };

    case "runToEnd":
      return { ...state, currentStep: state.lesson.steps.length - 1 };

    case "showComparison":
      return { ...state, phase: "compare" };

    case "showDiagnosis":
      return { ...state, phase: "diagnose" };

    case "showQuestion":
      return { ...state, phase: "teach" };

    case "selectOption":
      return { ...state, selectedOption: action.option, pending: true };

    case "evaluated":
      return {
        ...state,
        evaluation: action.evaluation,
        pending: false,
        hintsRevealed: action.evaluation.nextHint
          ? state.hintsRevealed + 1
          : state.hintsRevealed,
      };

    case "revealHint":
      return {
        ...state,
        hintsRevealed: Math.min(
          state.hintsRevealed + 1,
          state.diagnosis?.question?.hints.length ?? 0,
        ),
      };

    case "clearSelection":
      return { ...state, selectedOption: null, evaluation: null };

    case "acknowledgeUnderstanding":
      return {
        ...state,
        phase: "understood",
        resolvedMisconceptionLabel: state.diagnosis?.misconception?.label ?? null,
      };

    case "finish":
      return { ...state, phase: "complete" };

    default:
      return state;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** The step currently under the execution cursor. */
export function currentStepOf(state: SessionState) {
  return state.lesson.steps[state.currentStep];
}

export function isLastStep(state: SessionState): boolean {
  return state.currentStep >= state.lesson.steps.length - 1;
}
