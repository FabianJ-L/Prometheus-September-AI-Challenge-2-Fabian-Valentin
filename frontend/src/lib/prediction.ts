/**
 * Pairs a committed prediction with the run it was made for.
 *
 * Deliberately does *not* try to judge whether they match — a beginner's
 * program can print anything (a number, a list, several lines, nothing at
 * all), and no hand-rolled string/number comparison stays robust across
 * that. Judging is exactly the kind of nuanced call an LLM is good at and
 * code isn't, so this just packages the two raw facts; `## Student's
 * prediction` in `lib/ai/prompts.ts` hands both to the model and asks it to
 * compare them itself. Mock mode (`lib/ai/mock.ts`) states the same two
 * facts without a verdict, consistent with "measured, not interpreted."
 */

import type { Prediction, PredictionContext } from "@/lib/types";

/**
 * @param actual The run's raw stdout, or `null` when there's no run yet.
 */
export function evaluatePrediction(
  prediction: Prediction | null,
  actual: string | null,
): PredictionContext | null {
  if (!prediction || actual === null) return null;
  return { target: prediction.target, predicted: prediction.value.trim(), actual: actual.trim() };
}
