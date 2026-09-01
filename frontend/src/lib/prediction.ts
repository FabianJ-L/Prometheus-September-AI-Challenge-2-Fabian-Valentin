/**
 * Diffs a committed prediction against the one ground-truth value it was
 * about.
 *
 * Deliberately does *not* take a trace or stdout — a lesson decides what its
 * one predictable quantity is and extracts exactly that value (see
 * `extractStarterActual` in `mock/starter-project.ts`), so the student is
 * never asked to reproduce a program's entire output to be marked right.
 * That scales to arbitrarily large/verbose programs: the typing burden and
 * the comparison surface both stay a single bounded value, never "the whole
 * output," a heuristic that would only get flakier the more a program
 * prints (which number in five lines of output is even "the" answer?).
 *
 * Comparison itself is lenient rather than exact-string: a student who gets
 * the value right shouldn't be told they're wrong over formatting. If the
 * prediction reads as a bare number, compare numerically (comma/point
 * tolerant); otherwise fall back to a whitespace/case-normalised match,
 * accepting a prediction that's a substring of the real answer.
 */

import type { Prediction, PredictionContext } from "@/lib/types";

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Parses a lone number, accepting a comma as the decimal separator. */
function asNumber(s: string): number | null {
  const trimmed = s.trim();
  if (trimmed === "" || !/^-?\d+([.,]\d+)?$/.test(trimmed)) return null;
  const n = Number(trimmed.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function isPredictionMatch(predicted: string, actual: string): boolean {
  const predictedNum = asNumber(predicted);
  const actualNum = asNumber(actual);
  if (predictedNum !== null && actualNum !== null) {
    return Math.abs(predictedNum - actualNum) < 1e-9;
  }
  const normPredicted = normalize(predicted);
  const normActual = normalize(actual);
  return normPredicted !== "" && (normPredicted === normActual || normActual.includes(normPredicted));
}

/**
 * @param actual The lesson's extracted ground-truth value, or `null` when
 *   there's no run to compare against yet.
 */
export function evaluatePrediction(
  prediction: Prediction | null,
  actual: string | null,
): PredictionContext | null {
  if (!prediction || actual === null) return null;
  const predicted = prediction.value.trim();
  const actualTrimmed = actual.trim();
  return {
    target: prediction.target,
    predicted,
    actual: actualTrimmed,
    matches: isPredictionMatch(predicted, actualTrimmed),
  };
}
