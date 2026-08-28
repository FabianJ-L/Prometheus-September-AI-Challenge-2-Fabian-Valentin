import type { IterationRow, Misconception, TeacherQuestion } from "@/lib/types";

/**
 * Deterministic misconception library.
 *
 * Each entry is keyed by (lesson, the value the student predicted). A wrong
 * prediction is not noise — it encodes a specific, reconstructable model of how
 * the student thinks the program runs, and that reconstruction is what the
 * timeline replays.
 */

export interface MisconceptionSpec {
  misconception: Omit<Misconception, "timeline" | "divergenceIteration">;
  /** What the student's implied model produces per iteration. */
  studentModel: string[];
  question: TeacherQuestion;
  confidence: number;
}

/** Actual per-iteration values, used to build the timeline for each lesson. */
export const LESSON_ITERATIONS: Record<
  string,
  { rowLabel: "Iteration" | "Step"; bindings: string[]; actual: string[] }
> = {
  "loops-sum": {
    rowLabel: "Iteration",
    bindings: ["number = 2", "number = 4", "number = 6"],
    actual: ["2", "6", "12"],
  },
  "loops-sum-retest": {
    rowLabel: "Iteration",
    bindings: ["value = 3", "value = 5"],
    actual: ["3", "8"],
  },
  "assignment-rebind": {
    rowLabel: "Step",
    bindings: ["x = 10", "y = x", "x = 99"],
    actual: ["—", "10", "10"],
  },
};

const ACCUMULATION_QUESTION: TeacherQuestion = {
  id: "q-accumulation",
  preamble: "You're very close. Don't change the code yet.",
  focusLine: 5,
  text: "Before that line runs, `total` already holds a value. What does `total += number` do with the value that was already there?",
  options: [
    {
      id: "a",
      label: "It adds `number` to it and stores the new total",
      correct: true,
      response:
        "Exactly. `+=` reads the old value, adds to it, and rebinds the name — the previous value is an input, not something that gets thrown away.",
    },
    {
      id: "b",
      label: "It replaces `total` with `number`",
      correct: false,
      response:
        "That is the model your prediction implies. But look at iteration 2: `total` went 2 → 6, not 2 → 4. Something used the old 2.",
    },
    {
      id: "c",
      label: "It resets `total` to 0, then adds `number`",
      correct: false,
      response:
        "If `total` reset every pass, the final value would be 6 — the last item. Execution ended at 12.",
    },
    {
      id: "d",
      label: "I'm not sure",
      correct: false,
      response:
        "Take iteration 2 on its own: `total` was 2, `number` was 4, and `total` became 6. Which operation turns 2 and 4 into 6?",
    },
  ],
  hints: [
    "This is about what happens to a value that already exists in a variable.",
    "Compare iteration 2 in the trace against what your prediction implies for that same iteration.",
    "At iteration 2, `total` was 2 and `number` was 4. `total += number` evaluates 2 + 4 = 6, then rebinds `total` to 6.",
  ],
};

const RUNS_ONCE_QUESTION: TeacherQuestion = {
  id: "q-runs-once",
  preamble: "Let's check how many times the body actually ran.",
  focusLine: 4,
  text: "`numbers` holds three items. How many times does the indented line below the `for` run?",
  options: [
    {
      id: "a",
      label: "Once per item — three times",
      correct: true,
      response: "Right. The body runs once for every item the loop walks over.",
    },
    {
      id: "b",
      label: "Once, then the loop exits",
      correct: false,
      response:
        "That is what your prediction implies. But the trace records `number` taking the values 2, then 4, then 6 — three passes.",
    },
    {
      id: "c",
      label: "Once per line inside the loop",
      correct: false,
      response:
        "The number of lines in the body doesn't set the repeat count — the length of the sequence does.",
    },
    { id: "d", label: "I'm not sure", correct: false, response: "Count how many distinct values `number` takes in the trace." },
  ],
  hints: [
    "The repeat count comes from the sequence being iterated.",
    "Step through the trace and count how many values `number` takes.",
    "`numbers` has 3 items, so the body runs 3 times: `number` = 2, then 4, then 6.",
  ],
};

const NEVER_UPDATED_QUESTION: TeacherQuestion = {
  id: "q-never-updated",
  preamble: "Let's look at whether `total` changes at all.",
  focusLine: 5,
  text: "`total` starts at 0. Does the line inside the loop write a new value to it?",
  options: [
    {
      id: "a",
      label: "Yes — it rebinds `total` on every pass",
      correct: true,
      response: "Correct. `+=` is an assignment: it computes a value and stores it back into `total`.",
    },
    {
      id: "b",
      label: "No — it only reads `total`",
      correct: false,
      response:
        "If it only read `total`, the trace would show 0 the whole way through. It shows 0 → 2 → 6 → 12.",
    },
    {
      id: "c",
      label: "Only on the last pass",
      correct: false,
      response: "The trace shows `total` changing at every single iteration, not just the last.",
    },
    { id: "d", label: "I'm not sure", correct: false, response: "Watch the `total` row in the program state as you step." },
  ],
  hints: [
    "`+=` is a form of assignment, not just a read.",
    "Watch the `total` row in Program state while stepping through the loop.",
    "Each pass computes `total + number` and stores the result back into `total`.",
  ],
};

const REFERENCE_QUESTION: TeacherQuestion = {
  id: "q-reference",
  preamble: "Look at what `y = x` copied.",
  focusLine: 2,
  text: "When `y = x` ran, `x` was 10. Did `y` remember the *value* 10, or a link to the name `x`?",
  options: [
    {
      id: "a",
      label: "The value — `y` is bound to 10",
      correct: true,
      response: "Right. Assignment binds `y` to the value `x` evaluated to. Rebinding `x` later can't reach `y`.",
    },
    {
      id: "b",
      label: "A link to `x`, so `y` follows it",
      correct: false,
      response: "That is what your prediction implies. But the trace shows `x` becoming 99 while `y` stays 10.",
    },
    {
      id: "c",
      label: "Nothing — `y` is undefined until used",
      correct: false,
      response: "The trace shows `y` holding 10 immediately after line 2.",
    },
    { id: "d", label: "I'm not sure", correct: false, response: "Compare the `x` and `y` rows in the state panel at step 3." },
  ],
  hints: [
    "Assignment binds a name to a value, not to another name.",
    "Compare the `x` and `y` rows in the state panel at step 3.",
    "`y = x` evaluated `x` to 10 and bound `y` to 10. Line 3 rebound only `x`.",
  ],
};

const ACCUMULATION: MisconceptionSpec["misconception"] = {
  id: "assignment_vs_accumulation",
  label: "Assignment replaces, it doesn't accumulate",
  description:
    "The prediction implies `total += number` overwrites `total` with `number`, discarding the value the variable already held.",
  concepts: ["assignment", "accumulation"],
};

export const MISCONCEPTION_TABLE: Record<string, Record<string, MisconceptionSpec>> = {
  "loops-sum": {
    "6": {
      misconception: ACCUMULATION,
      studentModel: ["2", "4", "6"],
      question: ACCUMULATION_QUESTION,
      confidence: 0.94,
    },
    "2": {
      misconception: {
        id: "loop_body_runs_once",
        label: "The loop body runs only once",
        description: "The prediction implies the loop stops after the first item.",
        concepts: ["loops", "iteration"],
      },
      studentModel: ["2", "2", "2"],
      question: RUNS_ONCE_QUESTION,
      confidence: 0.86,
    },
    "0": {
      misconception: {
        id: "accumulator_never_updated",
        label: "`+=` reads but never writes",
        description: "The prediction implies the loop body never rebinds the accumulator.",
        concepts: ["assignment", "accumulation"],
      },
      studentModel: ["0", "0", "0"],
      question: NEVER_UPDATED_QUESTION,
      confidence: 0.82,
    },
  },
  "loops-sum-retest": {
    "5": {
      misconception: ACCUMULATION,
      studentModel: ["3", "5"],
      question: { ...ACCUMULATION_QUESTION, focusLine: 4 },
      confidence: 0.92,
    },
    "3": {
      misconception: {
        id: "loop_body_runs_once",
        label: "The loop body runs only once",
        description: "The prediction implies the loop stops after the first item.",
        concepts: ["loops", "iteration"],
      },
      studentModel: ["3", "3"],
      question: { ...RUNS_ONCE_QUESTION, focusLine: 3 },
      confidence: 0.84,
    },
    "0": {
      misconception: {
        id: "accumulator_never_updated",
        label: "`+=` reads but never writes",
        description: "The prediction implies the loop body never rebinds the accumulator.",
        concepts: ["assignment", "accumulation"],
      },
      studentModel: ["0", "0"],
      question: { ...NEVER_UPDATED_QUESTION, focusLine: 4 },
      confidence: 0.8,
    },
  },
  "assignment-rebind": {
    "99": {
      misconception: {
        id: "reference_semantics",
        label: "`y = x` makes `y` track `x`",
        description:
          "The prediction implies `y` holds a link to the name `x`, so rebinding `x` would change `y` too.",
        concepts: ["assignment", "references"],
      },
      studentModel: ["—", "10", "99"],
      question: REFERENCE_QUESTION,
      confidence: 0.9,
    },
  },
};

/** Used when the prediction doesn't match any catalogued model. */
export const UNCLEAR_MODEL: MisconceptionSpec = {
  misconception: {
    id: "unclear_model",
    label: "Model not yet identifiable",
    description:
      "Your prediction doesn't match a model NOESIS recognises yet. Replay the execution and locate the first step that surprised you.",
    concepts: ["accumulation", "loops"],
  },
  studentModel: [],
  question: {
    id: "q-unclear",
    preamble: "Let's narrow this down together.",
    text: "Step through the trace again. At which point did the program first do something you did not expect?",
    options: [
      {
        id: "a",
        label: "When the accumulator changed inside the loop",
        correct: true,
        response:
          "Good — that is the line to hold on to. `+=` combines the old value with the new one instead of replacing it.",
      },
      {
        id: "b",
        label: "When the loop started",
        correct: false,
        response: "The loop start only binds the next item. Look at the line inside the body instead.",
      },
      {
        id: "c",
        label: "At the final print",
        correct: false,
        response: "`print` only displays what was already there. The value was decided earlier, inside the loop.",
      },
      { id: "d", label: "I'm not sure", correct: false, response: "Step to iteration 2 and read the accumulator row." },
    ],
    hints: [
      "Focus on the one variable whose value changes most often.",
      "Step to iteration 2 and read the accumulator row before and after the body.",
      "Inside the loop, the accumulator is recomputed from its own previous value plus the current item.",
    ],
  },
  confidence: 0.41,
};

export function buildTimeline(lessonId: string, studentModel: string[]): IterationRow[] {
  const spec = LESSON_ITERATIONS[lessonId];
  if (!spec) return [];

  let diverged = false;
  return spec.actual.map((actual, i) => {
    const model = studentModel[i] ?? null;
    const isDivergence = !diverged && model !== null && model !== actual;
    if (isDivergence) diverged = true;
    return {
      iteration: i + 1,
      bindings: spec.bindings[i] ?? "",
      actual,
      studentModel: model,
      diverged: isDivergence,
    };
  });
}
