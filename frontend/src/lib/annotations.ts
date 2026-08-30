/**
 * Keeping annotations pointed at the right code.
 *
 * An annotation is anchored to a line number *and* the text that was on it.
 * The line number alone is worthless the moment the student types: everything
 * below the cursor shifts. So on every render each anchor is re-resolved
 * against the current file:
 *
 *   1. the recorded line still holds the recorded text  → keep it
 *   2. exactly one other line holds that text           → follow it
 *   3. anything else                                    → mark stale
 *
 * Stale annotations stay visible but visibly weakened. Silently re-pointing at
 * whatever now occupies that line number would be worse than saying nothing:
 * an annotation that confidently marks the wrong code teaches the wrong thing.
 */

import type { Annotation } from "@/lib/types";

export interface ResolvedAnnotation extends Annotation {
  /** Line the annotation renders on right now. */
  line: number;
  /** The anchor no longer matches the file — the code moved out from under it. */
  stale: boolean;
}

function normalise(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function resolveAnnotations(
  annotations: Annotation[],
  path: string | null,
  content: string,
): ResolvedAnnotation[] {
  if (annotations.length === 0) return [];
  const lines = content.split("\n");

  return annotations
    .filter((a) => a.anchor.path === path)
    .map((annotation) => {
      const { line, snippet } = annotation.anchor;
      const wanted = snippet ? normalise(snippet) : "";

      if (!wanted) {
        const inRange = line >= 1 && line <= lines.length;
        return { ...annotation, line, stale: !inRange };
      }

      if (line >= 1 && line <= lines.length && normalise(lines[line - 1]) === wanted) {
        return { ...annotation, line, stale: false };
      }

      const matches: number[] = [];
      for (let i = 0; i < lines.length; i += 1) {
        if (normalise(lines[i]) === wanted) matches.push(i + 1);
        if (matches.length > 1) break;
      }
      if (matches.length === 1) return { ...annotation, line: matches[0], stale: false };

      return { ...annotation, line: Math.min(Math.max(line, 1), lines.length || 1), stale: true };
    });
}

/** Tone → the CSS class suffix used by the decoration styles in globals.css. */
export function toneClass(annotation: ResolvedAnnotation): string {
  return annotation.stale ? "stale" : annotation.tone;
}
