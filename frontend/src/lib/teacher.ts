/**
 * The teaching service.
 *
 * The UI talks only to `TeacherService`. Today it is backed by a deterministic
 * local model; swapping in the FastAPI backend (and behind it an LLM) is a
 * change of one factory call, not a change to any component. Nothing rendered
 * to the student may depend on which implementation is active.
 */

import type {
  AnswerEvaluation,
  ConceptUpdate,
  Diagnosis,
  Lesson,
  TeacherOption,
  TeacherQuestion,
} from "@/lib/types";
import { CONCEPTS_BY_ID } from "@/mock/concepts";
import { MISCONCEPTION_TABLE, UNCLEAR_MODEL, buildTimeline } from "@/mock/teacher";

export interface DiagnoseInput {
  lesson: Lesson;
  prediction: string;
  /** 1 for the first attempt at a concept, 2+ after a diagnosis. */
  attempt: number;
}

export interface EvaluateInput {
  question: TeacherQuestion;
  option: TeacherOption;
  hintsRevealed: number;
}

export interface TeacherService {
  diagnose(input: DiagnoseInput): Promise<Diagnosis>;
  evaluate(input: EvaluateInput): Promise<AnswerEvaluation>;
}

/** "12 " and "12" are the same answer; " 12.0" is not our concern here. */
export function normalizeAnswer(raw: string): string {
  return raw.trim().replace(/^\+/, "");
}

function conceptUpdates(lesson: Lesson, gain: number): ConceptUpdate[] {
  return lesson.concepts
    .map((id) => CONCEPTS_BY_ID[id])
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => ({
      conceptId: c.id,
      label: c.label,
      from: c.mastery,
      // Weakest concepts move most — that is where the evidence is informative.
      to: Math.min(0.98, c.mastery + gain * (1 - c.mastery)),
    }))
    .filter((u) => u.to - u.from > 0.005);
}

// ---------------------------------------------------------------------------
// Local deterministic implementation
// ---------------------------------------------------------------------------

export function createLocalTeacher(): TeacherService {
  return {
    async diagnose({ lesson, prediction, attempt }: DiagnoseInput): Promise<Diagnosis> {
      const predicted = normalizeAnswer(prediction);
      const matches = predicted === lesson.actual;

      const comparison = {
        target: lesson.predictionTarget,
        predicted,
        actual: lesson.actual,
        matches,
      };

      if (matches) {
        // Correct after a diagnosis is much stronger evidence than correct
        // first time — the student rebuilt the model rather than recalling it.
        const gain = attempt > 1 ? 0.42 : 0.16;
        return {
          comparison,
          misconception: null,
          question: null,
          confidence: 1,
          conceptUpdates: conceptUpdates(lesson, gain),
          retestLessonId: null,
        };
      }

      const spec = MISCONCEPTION_TABLE[lesson.id]?.[predicted] ?? UNCLEAR_MODEL;
      const timeline = buildTimeline(lesson.id, spec.studentModel);
      const divergence = timeline.find((row) => row.diverged)?.iteration ?? null;

      return {
        comparison,
        misconception: { ...spec.misconception, timeline, divergenceIteration: divergence },
        question: spec.question,
        confidence: spec.confidence,
        conceptUpdates: [],
        retestLessonId: lesson.retestOf ? null : retestFor(lesson.id),
      };
    },

    async evaluate({ question, option, hintsRevealed }: EvaluateInput): Promise<AnswerEvaluation> {
      return {
        correct: option.correct,
        response: option.response,
        nextHint: option.correct ? null : (question.hints[hintsRevealed] ?? null),
      };
    },
  };
}

const RETESTS: Record<string, string> = {
  "loops-sum": "loops-sum-retest",
};

function retestFor(lessonId: string): string | null {
  return RETESTS[lessonId] ?? null;
}

// ---------------------------------------------------------------------------
// Backend implementation
// ---------------------------------------------------------------------------

/**
 * Adapter for the FastAPI backend (`POST /api/sessions`, `/prediction`), which
 * in turn runs the AST → trace → misconception → LLM pipeline. Not wired up for
 * the offline demo; it exists to keep the seam honest and typed.
 *
 * Note the return type: identical to `createLocalTeacher`. The UI cannot tell
 * the two apart, which is the whole point of this interface.
 */
export function createHttpTeacher(baseUrl: string): TeacherService {
  const local = createLocalTeacher();

  return {
    async diagnose(input: DiagnoseInput): Promise<Diagnosis> {
      const session = await post<{ id: string }>(`${baseUrl}/api/sessions`, {
        lesson_id: input.lesson.id,
      });
      const state = await post<BackendSession>(
        `${baseUrl}/api/sessions/${session.id}/prediction`,
        { answer: input.prediction },
      );

      const check = state.diagnostic?.prediction_check;
      if (!check) return local.diagnose(input);

      // The backend classifies the misconception; the presentation layer
      // (timeline, options, hints) stays client-side for now.
      const fallback = await local.diagnose(input);
      if (!state.diagnostic?.misconception) return fallback;

      return {
        ...fallback,
        comparison: {
          target: input.lesson.predictionTarget,
          predicted: String(check.predicted),
          actual: String(check.actual),
          matches: check.matches,
        },
        misconception: fallback.misconception && {
          ...fallback.misconception,
          label: state.diagnostic.misconception.label,
          description: state.diagnostic.misconception.description,
        },
        confidence: state.diagnostic.confidence,
      };
    },

    evaluate: local.evaluate,
  };
}

interface BackendSession {
  id: string;
  diagnostic: {
    prediction_check: { matches: boolean; predicted: unknown; actual: unknown };
    misconception: { id: string; label: string; description: string } | null;
    confidence: number;
  } | null;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------

/**
 * The demo runs entirely offline. Set NEXT_PUBLIC_TEACHER=http (plus
 * NEXT_PUBLIC_API_BASE_URL) to route through the backend instead.
 */
export const teacher: TeacherService =
  process.env.NEXT_PUBLIC_TEACHER === "http"
    ? createHttpTeacher(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000")
    : createLocalTeacher();
