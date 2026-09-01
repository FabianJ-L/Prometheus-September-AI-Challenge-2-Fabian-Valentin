/**
 * Annotations for offline mode.
 *
 * Port of `backend/app/ai/mock.py`. Without a `GROQ_API_KEY` the assistant
 * can't reason, but the editor layer should still have something true to
 * draw — a demo on bad conference wifi is exactly when you least want a
 * blank screen.
 *
 * Everything here is derived from the trace, so it is `measured`, not `ai`:
 * these annotations state what the run did, never what it means.
 */

import { REF_KEY, type Anchor, type Annotation, type AnnotationKind, type ExecutionTrace, type PredictionContext, type ProjectFile, type TraceValue } from "@/lib/types";

function lineText(file: ProjectFile, line: number): string | null {
  const lines = file.content.split("\n");
  return line >= 1 && line <= lines.length ? lines[line - 1].trim() : null;
}

function anchorAt(file: ProjectFile, line: number): Anchor | null {
  const text = lineText(file, line);
  if (text === null) return null;
  return { path: file.path, line, endLine: null, column: null, endColumn: null, snippet: text };
}

/** Names grouped by the object they point at, for groups larger than one. */
function sharedObjects(bindings: Record<string, TraceValue>): string[][] {
  const byRef: Record<string, string[]> = {};
  for (const [name, value] of Object.entries(bindings)) {
    if (value !== null && typeof value === "object" && REF_KEY in value) {
      const ref = String((value as { $ref: string })[REF_KEY]);
      (byRef[ref] ??= []).push(name);
    }
  }
  return Object.values(byRef).filter((names) => names.length > 1);
}

/**
 * The last line after which one of the shared objects changed size. A rough
 * but reliable heuristic: the step where the object the names share stopped
 * looking the way it did before is where the mutation happened.
 */
function lastMutationLine(trace: ExecutionTrace, names: string[]): number | null {
  let target: string | null = null;
  for (const name of names) {
    const value = trace.finalLocals[name];
    if (value !== null && typeof value === "object" && REF_KEY in value) {
      target = String((value as { $ref: string })[REF_KEY]);
      break;
    }
  }
  if (target === null) return null;

  // A step records the state *before* its line runs, so a change first shows
  // up on the step after the one that caused it — report the causing line.
  let line: number | null = null;
  let previous: string | null = null;
  let previousLine: number | null = null;
  for (const step of trace.steps) {
    const obj = step.heap[target];
    if (obj !== undefined) {
      if (previous !== null && obj.preview !== previous && previousLine !== null) {
        line = previousLine;
      }
      previous = obj.preview;
    }
    previousLine = step.line;
  }
  return line;
}

/**
 * Facts about the last run, placed on the lines they belong to. When the
 * student asked *at* a line, that line is what gets marked.
 */
export function offlineAnnotations(
  files: ProjectFile[],
  activePath: string | null,
  trace: ExecutionTrace | null,
  askedAt: Anchor | null = null,
  prediction: PredictionContext | null = null,
): Annotation[] {
  const file = files.find((f) => f.path === activePath) ?? files[0];
  if (!file) return [];

  // 0. A fresh wrong prediction is the most useful moment to mark — state
  // the two facts side by side, never why they differ (mock mode can't
  // diagnose, only measure).
  if (prediction !== null && !prediction.matches && trace !== null) {
    const last = [...trace.steps].reverse().find((s) => s.source);
    const anchor = last !== undefined ? anchorAt(file, last.line) : null;
    if (anchor !== null) {
      return [
        {
          id: "offline-prediction-mismatch",
          kind: "problem" as AnnotationKind,
          source: "measured",
          anchor,
          tone: "warning",
          label: `Vorhersage war ${prediction.predicted}, tatsächlich ${prediction.actual}`,
          body: null,
          variables: [],
          threadId: null,
          stale: false,
        },
        {
          id: "offline-prediction-mismatch-note",
          kind: "note" as AnnotationKind,
          source: "measured",
          anchor: { ...anchor },
          tone: "neutral",
          label: null,
          body:
            `Deine Vorhersage war **${prediction.predicted}**, tatsächlich ` +
            `ist die Ausgabe **${prediction.actual}**.`,
          variables: [],
          threadId: null,
          stale: false,
        },
      ];
    }
  }

  if (askedAt !== null) {
    const anchor = anchorAt(file, askedAt.line);
    if (anchor !== null && trace !== null) {
      const step = trace.steps.find((s) => s.line === askedAt.line && s.source);
      if (step !== undefined) {
        return [
          {
            id: "offline-asked",
            kind: "memory" as AnnotationKind,
            source: "measured",
            anchor,
            tone: "neutral",
            label: null,
            body: null,
            variables: Object.keys(step.locals),
            threadId: null,
            stale: false,
          },
        ];
      }
    }
  }

  if (trace === null) return [];

  const annotations: Annotation[] = [];
  const add = (a: Annotation | null) => {
    if (a !== null) annotations.push(a);
  };

  // 1. An error is the most useful thing to point at, so it wins.
  if (trace.error && trace.errorLine) {
    const anchor = anchorAt(file, trace.errorLine);
    if (anchor !== null) {
      add({
        id: "offline-error",
        kind: "problem" as AnnotationKind,
        source: "measured",
        anchor,
        tone: "danger",
        label: trace.error,
        body: null,
        variables: [],
        threadId: null,
        stale: false,
      });
      add({
        id: "offline-error-note",
        kind: "note" as AnnotationKind,
        source: "measured",
        anchor: { ...anchor },
        tone: "neutral",
        label: null,
        body:
          `Der Lauf endet hier mit **${trace.error}**.\n\n` +
          "Geh im Debugger einen Schritt zurück und schau dir an, " +
          "welchen Wert die beteiligten Variablen an dieser Stelle haben.",
        variables: [],
        threadId: null,
        stale: false,
      });
    }
    return annotations;
  }

  // 2. Two names, one object — the misconception this heuristic exists to catch.
  const groups = sharedObjects(trace.finalLocals);
  if (groups.length > 0 && trace.steps.length > 0) {
    const names = groups[0];
    const mutation = lastMutationLine(trace, names);
    const anchor = mutation !== null ? anchorAt(file, mutation) : null;
    if (anchor !== null) {
      const joined = names.map((n) => `\`${n}\``).join(" und ");
      add({
        id: "offline-alias",
        kind: "line" as AnnotationKind,
        source: "measured",
        anchor,
        tone: "focus",
        label: "verändert das geteilte Objekt",
        body: null,
        variables: [],
        threadId: null,
        stale: false,
      });
      add({
        id: "offline-alias-memory",
        kind: "memory" as AnnotationKind,
        source: "measured",
        anchor: { ...anchor },
        tone: "neutral",
        label: null,
        body: null,
        variables: names,
        threadId: null,
        stale: false,
      });
      add({
        id: "offline-alias-note",
        kind: "note" as AnnotationKind,
        source: "measured",
        anchor: { ...anchor },
        tone: "neutral",
        label: null,
        body:
          `${joined} zeigen auf **dasselbe Objekt** — es wurde nie ` +
          "kopiert. Eine Änderung über den einen Namen ist deshalb " +
          "auch über den anderen sichtbar.",
        variables: [],
        threadId: null,
        stale: false,
      });
      return annotations;
    }
  }

  // 3. Nothing dramatic happened: mark where the run ended.
  const last = [...trace.steps].reverse().find((s) => s.source);
  if (last !== undefined) {
    const anchor = anchorAt(file, last.line);
    if (anchor !== null) {
      add({
        id: "offline-last",
        kind: "line" as AnnotationKind,
        source: "measured",
        anchor,
        tone: "info",
        label: "letzte ausgeführte Zeile",
        body: null,
        variables: [],
        threadId: null,
        stale: false,
      });
    }
  }
  return annotations;
}
