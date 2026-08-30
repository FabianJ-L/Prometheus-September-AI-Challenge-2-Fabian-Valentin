"use client";

import MonacoEditor, { loader, type Monaco, type OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { editor as MonacoEditorNS } from "monaco-editor";
import { AnnotationBlock } from "@/components/workspace/AnnotationBlock";
import { EditorInline } from "@/components/workspace/EditorInline";
import { EditorZone } from "@/components/workspace/EditorZone";
import { resolveAnnotations, toneClass, type ResolvedAnnotation } from "@/lib/annotations";
import { applyNoesisTheme, NOESIS_THEME } from "@/lib/monaco-theme";
import { useSettings } from "@/lib/settings";
import { formatValue } from "@/lib/values";
import { useWorkspace } from "@/lib/workspace";
import type { Heap, TraceStep, TraceValue } from "@/lib/types";

const DEBOUNCE_MS = 300;

// Serve Monaco from `public/monaco` instead of the default jsDelivr CDN, so the
// editor works offline. `npm install` refreshes the copy via the postinstall
// script in package.json.
loader.config({ paths: { vs: "/monaco/vs" } });

/**
 * The editor, and everything the assistant draws on top of it.
 *
 * Annotations reach the code through exactly two Monaco mechanisms, chosen so
 * they can never fight each other:
 *
 *   decorations — marks *on* the text: whole lines, spans inside a line, and
 *     gutter glyphs. They shift with the text as it is edited.
 *   view zones  — blocks *between* the lines: notes and memory diagrams. They
 *     push the code apart instead of covering it.
 *   content widgets — short trailing text: annotation labels and the inline
 *     values from the trace, anchored past the end of the line so they never
 *     sit on top of code. (Decoration injected text would be the natural fit
 *     and renders nothing in the bundled Monaco — see EditorInline.)
 */
export function Editor() {
  const { state, dispatch } = useWorkspace();
  const { settings } = useSettings();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorations = useRef<MonacoEditorNS.IEditorDecorationsCollection | null>(null);

  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const activeFile = state.files.find((f) => f.path === state.activePath) ?? null;

  /* --- what the trace says (measured) ---------------------------------- */

  const debugStep = useMemo<TraceStep | null>(() => {
    if (state.traceViewMode !== "debug" || !state.lastTrace || state.isRunning) return null;
    if (state.lastTrace.entryPath !== activeFile?.path) return null;
    const steps = state.lastTrace.steps;
    if (steps.length === 0) return null;
    return steps[Math.min(state.debugStepIndex, steps.length - 1)] ?? null;
  }, [state.traceViewMode, state.lastTrace, state.isRunning, state.debugStepIndex, activeFile?.path]);

  const currentLine = debugStep && debugStep.source.length > 0 ? debugStep.line : null;

  const bindings: Record<string, TraceValue> = useMemo(
    () => debugStep?.locals ?? state.lastTrace?.finalLocals ?? {},
    [debugStep, state.lastTrace],
  );
  const heap: Heap = useMemo(
    () => debugStep?.heap ?? state.lastTrace?.finalHeap ?? {},
    [debugStep, state.lastTrace],
  );

  /* --- what the assistant says (interpreted) --------------------------- */

  const annotations = useMemo(
    () =>
      resolveAnnotations(state.annotations, activeFile?.path ?? null, activeFile?.content ?? "").filter(
        (a) => !dismissed.includes(a.id),
      ),
    [state.annotations, activeFile?.path, activeFile?.content, dismissed],
  );

  // A fresh set of annotations is a fresh slate for what the user dismissed.
  useEffect(() => setDismissed([]), [state.annotations]);

  const blocks = annotations.filter((a) => a.kind === "note" || a.kind === "memory");
  const labelled = annotations.filter((a) => a.label && (a.kind === "line" || a.kind === "range"));

  // Column just past the last character of each line, so trailing widgets sit
  // clear of the code rather than on it.
  const lineEnds = useMemo(() => {
    const lines = (activeFile?.content ?? "").split("\n");
    return lines.map((text) => text.length + 1);
  }, [activeFile?.content]);
  const endColumn = useCallback((line: number) => lineEnds[line - 1] ?? 1, [lineEnds]);

  const valueSummary = useMemo(
    () => (debugStep && state.showInlineValues ? inlineValueSummary(bindings, heap) : ""),
    [debugStep, state.showInlineValues, bindings, heap],
  );

  /* --- decorations ------------------------------------------------------ */

  useEffect(() => {
    const editor = editorRef.current;
    const collection = decorations.current;
    if (!editor || !collection) return;
    const model = editor.getModel();
    if (!model) return;

    const next: MonacoEditorNS.IModelDeltaDecoration[] = [];

    // The current line of the step debugger. Measured, so it gets the plain
    // "this is where you are" treatment rather than an opinionated tone.
    if (currentLine !== null && currentLine <= model.getLineCount()) {
      next.push({
        range: { startLineNumber: currentLine, startColumn: 1, endLineNumber: currentLine, endColumn: 1 },
        options: {
          isWholeLine: true,
          className: "noesis-current-line",
          glyphMarginClassName: "noesis-glyph noesis-glyph--current",
          stickiness: 1, // NeverGrowsWhenTypingAtEdges
        },
      });
    }

    for (const annotation of annotations) {
      if (annotation.line > model.getLineCount()) continue;
      const tone = toneClass(annotation);

      if (annotation.kind === "line" || annotation.kind === "note" || annotation.kind === "memory") {
        next.push({
          range: {
            startLineNumber: annotation.line,
            startColumn: 1,
            endLineNumber: annotation.anchor.endLine ?? annotation.line,
            endColumn: 1,
          },
          options: {
            isWholeLine: true,
            className: `noesis-line noesis-line--${tone}`,
            glyphMarginClassName: `noesis-glyph noesis-glyph--${annotation.source}`,
            glyphMarginHoverMessage: hover(annotation),
            hoverMessage: annotation.kind === "line" ? hover(annotation) : undefined,
            stickiness: 1,
          },
        });
      }

      if (annotation.kind === "range") {
        const startColumn = annotation.anchor.column ?? 1;
        const endColumn = annotation.anchor.endColumn ?? model.getLineMaxColumn(annotation.line);
        next.push({
          range: {
            startLineNumber: annotation.line,
            startColumn,
            endLineNumber: annotation.line,
            endColumn,
          },
          options: {
            inlineClassName: `noesis-range noesis-range--${tone}`,
            glyphMarginClassName: `noesis-glyph noesis-glyph--${annotation.source}`,
            hoverMessage: hover(annotation),
            stickiness: 1,
          },
        });
      }
    }

    collection.set(next);
  }, [annotations, currentLine]);

  /* --- markers (squiggles) --------------------------------------------- */

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;

    const markers = annotations
      .filter((a) => a.kind === "problem" && a.line <= model.getLineCount())
      .map((a) => ({
        startLineNumber: a.line,
        endLineNumber: a.line,
        startColumn: a.anchor.column ?? 1,
        endColumn: a.anchor.endColumn ?? model.getLineMaxColumn(a.line),
        message: a.label ?? "",
        severity: a.tone === "danger" ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
        source: a.source === "ai" ? "NOESIS" : "Lauf",
      }));

    monaco.editor.setModelMarkers(model, "noesis", markers);
    return () => monaco.editor.setModelMarkers(model, "noesis", []);
  }, [annotations]);

  /* --- theme ------------------------------------------------------------ */

  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    // The palette lives in CSS, so it is only correct after the document has the
    // new theme attribute — one frame later.
    const id = requestAnimationFrame(() => applyNoesisTheme(monaco));
    return () => cancelAnimationFrame(id);
  }, [settings.theme, mounted]);

  useEffect(() => {
    if (settings.theme !== "system" || typeof window === "undefined") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (monacoRef.current) applyNoesisTheme(monacoRef.current);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [settings.theme]);

  /* --- reveal the line being stepped through ---------------------------- */

  useEffect(() => {
    if (currentLine === null) return;
    editorRef.current?.revealLineInCenterIfOutsideViewport(currentLine, 0 /* Smooth */);
  }, [currentLine]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onMount = useCallback<OnMount>((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    decorations.current = editor.createDecorationsCollection([]);
    applyNoesisTheme(monaco);
    setMounted(true);
  }, []);

  if (!activeFile) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-fg-subtle">
        Select or create a file to start editing.
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <MonacoEditor
        key={activeFile.path}
        language={activeFile.language}
        value={activeFile.content}
        theme={NOESIS_THEME}
        options={{
          fontSize: settings.codeFontSize,
          fontFamily: "var(--font-mono), ui-monospace, SFMono-Regular, monospace",
          fontLigatures: true,
          lineNumbers: settings.lineNumbers ? "on" : "off",
          glyphMargin: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: "line",
          smoothScrolling: settings.animations,
          cursorBlinking: settings.animations ? "smooth" : "solid",
          scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
          overviewRulerLanes: 0,
          occurrencesHighlight: "off",
        }}
        onMount={onMount}
        onChange={(value) => {
          const content = value ?? "";
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            dispatch({ type: "UPDATE_FILE_CONTENT", path: activeFile.path, content });
          }, DEBOUNCE_MS);
        }}
      />

      {mounted && editorRef.current && valueSummary && currentLine !== null && (
        <EditorInline
          editor={editorRef.current}
          id="trace-values"
          lineNumber={currentLine}
          column={endColumn(currentLine)}
        >
          <span className="noesis-inline-value">{valueSummary}</span>
        </EditorInline>
      )}

      {mounted &&
        editorRef.current &&
        labelled.map((annotation) => (
          <EditorInline
            key={annotation.id}
            editor={editorRef.current!}
            id={annotation.id}
            lineNumber={annotation.line}
            column={endColumn(annotation.line)}
          >
            <span className={`noesis-label noesis-label--${toneClass(annotation)}`}>
              {annotation.label}
            </span>
          </EditorInline>
        ))}

      {mounted &&
        editorRef.current &&
        blocks.map((annotation) => (
          <EditorZone
            key={annotation.id}
            editor={editorRef.current!}
            afterLineNumber={annotation.line}
          >
            <AnnotationBlock
              annotation={annotation}
              bindings={bindings}
              heap={heap}
              onDismiss={() => setDismissed((ids) => [...ids, annotation.id])}
            />
          </EditorZone>
        ))}
    </div>
  );
}

/** A compact "x = 1 · y = [1, 2]" for the end of the current line. */
function inlineValueSummary(bindings: Record<string, TraceValue>, heap: Heap): string {
  const names = Object.keys(bindings);
  if (names.length === 0) return "";
  const shown = names.slice(0, 4).map((name) => `${name} = ${formatValue(bindings[name], heap)}`);
  if (names.length > shown.length) shown.push(`+${names.length - shown.length}`);
  return shown.join("  ·  ");
}

/** Hover text, with authorship attached so the claim can be weighed. */
function hover(annotation: ResolvedAnnotation): { value: string } | undefined {
  const parts: string[] = [];
  if (annotation.label) parts.push(annotation.label);
  if (annotation.body) parts.push(annotation.body);
  if (parts.length === 0) return undefined;
  const who = annotation.source === "ai" ? "NOESIS meint" : "Gemessen";
  const stale = annotation.stale ? "\n\n_Der Code hat sich seit dieser Anmerkung geändert._" : "";
  return { value: `**${who}** · ${parts.join(" — ")}${stale}` };
}
