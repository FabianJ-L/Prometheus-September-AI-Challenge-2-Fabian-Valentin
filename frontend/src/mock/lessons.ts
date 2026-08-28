import type { Lesson } from "@/lib/types";
import { REBIND_TRACE, SUM_LIST_TRACE, SUM_RETEST_TRACE } from "@/mock/execution";

export const LESSONS: Lesson[] = [
  {
    id: "loops-sum",
    track: "Python Fundamentals",
    unit: "Loops & Iteration",
    title: "Summing a list",
    index: 3,
    total: 5,
    concepts: ["loops", "iteration", "accumulation", "assignment"],
    code: `numbers = [2, 4, 6]
total = 0

for number in numbers:
    total += number

print(total)`,
    predictionPrompt: "What will `total` be?",
    predictionTarget: "total",
    actual: "12",
    steps: SUM_LIST_TRACE,
  },
  {
    id: "loops-sum-retest",
    track: "Python Fundamentals",
    unit: "Loops & Iteration",
    title: "Summing a list — retest",
    index: 4,
    total: 5,
    concepts: ["loops", "iteration", "accumulation", "assignment"],
    code: `total = 0

for value in [3, 5]:
    total += value

print(total)`,
    predictionPrompt: "What will `total` be?",
    predictionTarget: "total",
    actual: "8",
    steps: SUM_RETEST_TRACE,
    retestOf: "loops-sum",
  },
  {
    id: "assignment-rebind",
    track: "Python Fundamentals",
    unit: "Variables & Assignment",
    title: "What = really does",
    index: 2,
    total: 4,
    concepts: ["assignment", "variables", "references"],
    code: `x = 10
y = x
x = 99
print(y)`,
    predictionPrompt: "What will `y` be?",
    predictionTarget: "y",
    actual: "10",
    steps: REBIND_TRACE,
  },
];

export const LESSONS_BY_ID: Record<string, Lesson> = Object.fromEntries(
  LESSONS.map((l) => [l.id, l]),
);

/** The lesson the dashboard's Continue card resumes. */
export const CURRENT_LESSON_ID = "loops-sum";

export function getLesson(id: string): Lesson {
  const lesson = LESSONS_BY_ID[id];
  if (!lesson) throw new Error(`Unknown lesson: ${id}`);
  return lesson;
}
