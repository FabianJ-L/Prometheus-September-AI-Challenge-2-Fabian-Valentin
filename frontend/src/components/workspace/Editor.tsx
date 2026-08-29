"use client";

import MonacoEditor from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import { useSettings } from "@/lib/settings";
import { useWorkspace } from "@/lib/workspace";

const DEBOUNCE_MS = 300;

/** Monaco wrapper bound to the active file. Python only for now — `language`
 * comes straight from the file, so adding more languages later is a data
 * change, not a rewrite. */
export function Editor() {
  const { state, dispatch } = useWorkspace();
  const { settings } = useSettings();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeFile = state.files.find((f) => f.path === state.activePath) ?? null;

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

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
