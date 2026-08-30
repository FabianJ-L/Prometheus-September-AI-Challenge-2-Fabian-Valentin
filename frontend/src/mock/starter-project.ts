import type { ProjectFile } from "@/lib/types";

/**
 * Seeds a fresh workspace on first load. `main.py` has a deliberate small
 * bug (assignment instead of accumulation) so Run → wrong output → chat →
 * Socratic guidance works end-to-end without the user having to write
 * anything first.
 *
 * `lists.py` carries the other classic misconception — two names for one list
 * — so the memory view has something to show on a fresh workspace without the
 * user having to construct the case themselves.
 *
 * `helpers.py` is not imported by `main.py` at run time — the executor
 * doesn't support cross-file imports yet (see docs/ARCHITECTURE.md) — but it
 * demonstrates the file tree and gives the assistant a second file to
 * reference. That's a real, visible limitation, not a hidden one.
 */
export const STARTER_FILES: ProjectFile[] = [
  {
    path: "main.py",
    language: "python",
    content: `def average(numbers):
    total = 0
    for n in numbers:
        total = n
    return total / len(numbers)


grades = [88, 92, 79, 95, 84]
print("Average:", average(grades))
`,
  },
  {
    path: "lists.py",
    language: "python",
    content: `scores = [10, 20, 30]
backup = scores
backup.append(40)

print("scores:", scores)
print("backup:", backup)
`,
  },
  {
    path: "helpers.py",
    language: "python",
    content: `def format_grade(value):
    """Round to one decimal and add a percent sign."""
    return f"{value:.1f}%"


def letter_grade(value):
    if value >= 90:
        return "A"
    if value >= 80:
        return "B"
    if value >= 70:
        return "C"
    return "F"
`,
  },
];

export const STARTER_ENTRY_PATH = "main.py";
