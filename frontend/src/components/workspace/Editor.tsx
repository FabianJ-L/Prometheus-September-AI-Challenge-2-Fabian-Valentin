"use client";

import MonacoEditor, { loader, type OnMount } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import { useSettings } from "@/lib/settings";
import { useWorkspace } from "@/lib/workspace";

const DEBOUNCE_MS = 300;

// Serve Monaco from `public/monaco` instead of the default jsDelivr CDN, so the
// editor works offline. `npm install` refreshes the copy via the postinstall
// script in package.json.
loader.config({ paths: { vs: "/monaco/vs" } });

/** Monaco wrapper bound to the active file. Python only for now — `language`
 * comes straight from the file, so adding more languages later is a data
 * change, not a rewrite. */
export function Editor() {
  const { state, dispatch } = useWorkspace();
  const { settings } = useSettings();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const decorationIds = useRef<string[]>([]);

  const activeFile = state.files.find((f) => f.path === state.activePath) ?? null;

  // In debug mode, mirror the step debugger's current line as a highlight —
  // the same visual language as stepping through a debugger in an IDE.
  const debugStep =
    state.traceViewMode === "debug" &&
    state.lastTrace &&
    !state.isRunning &&
    state.lastTrace.entryPath === activeFile?.path
      ? state.lastTrace.steps[Math.min(state.debugStepIndex, state.lastTrace.steps.length - 1)]
      : null;
  const highlightLine = debugStep && debugStep.source.length > 0 ? debugStep.line : null;

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;

    decorationIds.current = editor.deltaDecorations(
      decorationIds.current,
      highlightLine
        ? [
            {
              range: { startLineNumber: highlightLine, startColumn: 1, endLineNumber: highlightLine, endColumn: 1 },
              options: { isWholeLine: true, className: "debug-current-line" },
            },
          ]
        : [],
    );
  }, [highlightLine, activeFile?.path]);

  if (!activeFile) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-fg-subtle">
        Select or create a file to start editing.
      </div>
    );
  }

  return (
    <MonacoEditor
      key={activeFile.path}
      language={activeFile.language}
      value={activeFile.content}
      theme={settings.theme === "light" ? "vs" : "vs-dark"}
      options={{
        fontSize: settings.codeFontSize,
        fontFamily: "var(--font-mono)",
        lineNumbers: settings.lineNumbers ? "on" : "off",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 12 },
      }}
      onMount={(editor) => {
        editorRef.current = editor;
        decorationIds.current = [];
      }}
      onChange={(value) => {
        const content = value ?? "";
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          dispatch({ type: "UPDATE_FILE_CONTENT", path: activeFile.path, content });
        }, DEBOUNCE_MS);
      }}
    />
  );
}
