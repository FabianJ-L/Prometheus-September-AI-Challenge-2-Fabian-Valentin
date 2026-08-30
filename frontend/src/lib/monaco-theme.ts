"use client";

import type { Monaco } from "@monaco-editor/react";

/**
 * A Monaco theme built from the app's own design tokens.
 *
 * Monaco needs literal hex, so the values are read off `document.documentElement`
 * at runtime rather than hard-coded. That has one useful consequence: because
 * `globals.css` already resolves the right palette for dark, light and system,
 * reading the computed values gives the effective theme for free — including
 * the "system" case, which a `theme === "light"` check gets wrong whenever the
 * OS is in light mode.
 *
 * Re-run `applyNoesisTheme` whenever the theme changes; Monaco redefines in
 * place and repaints.
 */

export const NOESIS_THEME = "noesis";

function token(styles: CSSStyleDeclaration, name: string, fallback: string): string {
  const raw = styles.getPropertyValue(name).trim();
  if (!raw) return fallback;
  // Tokens are stored as space-separated channels ("232 234 237") so Tailwind
  // can apply opacity to them; Monaco wants "#e8eaed".
  const channels = raw.split(/[\s,]+/).map(Number);
  if (channels.length < 3 || channels.some(Number.isNaN)) return raw.startsWith("#") ? raw : fallback;
  return `#${channels
    .slice(0, 3)
    .map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Is the effective palette dark? Decides Monaco's own base theme. */
function isDark(background: string): boolean {
  const value = background.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  // Rec. 601 luma — good enough to pick a base theme.
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

export function applyNoesisTheme(monaco: Monaco): void {
  if (typeof window === "undefined") return;
  const styles = getComputedStyle(document.documentElement);

  const bg = token(styles, "--bg", "#0a0b0d");
  const fg = token(styles, "--fg", "#e8eaed");
  const subtle = token(styles, "--fg-subtle", "#6b7280");
  const line = token(styles, "--line", "#23262d");
  const accent = token(styles, "--accent", "#7b8cff");
  const raised = token(styles, "--raised", "#171a1f");

  const keyword = token(styles, "--code-keyword", "#c4a0ff");
  const string = token(styles, "--code-string", "#9ed68a");
  const number = token(styles, "--code-number", "#e8b888");
  const builtin = token(styles, "--code-builtin", "#7fd1e8");
  const func = token(styles, "--code-func", "#e8d48b");
  const comment = token(styles, "--code-comment", "#5f6672");

  monaco.editor.defineTheme(NOESIS_THEME, {
    base: isDark(bg) ? "vs-dark" : "vs",
    inherit: true,
    rules: [
      { token: "", foreground: fg },
      { token: "keyword", foreground: keyword },
      { token: "keyword.flow", foreground: keyword },
      { token: "string", foreground: string },
      { token: "string.escape", foreground: number },
      { token: "number", foreground: number },
      { token: "comment", foreground: comment, fontStyle: "italic" },
      { token: "type", foreground: builtin },
      { token: "type.identifier", foreground: builtin },
      { token: "predefined", foreground: builtin },
      { token: "constant", foreground: number },
      { token: "function", foreground: func },
      { token: "identifier", foreground: fg },
      { token: "delimiter", foreground: subtle },
      { token: "operator", foreground: subtle },
    ],
    colors: {
      "editor.background": bg,
      "editor.foreground": fg,
      "editorLineNumber.foreground": subtle,
      "editorLineNumber.activeForeground": fg,
      "editorCursor.foreground": accent,
      "editor.selectionBackground": `${accent}40`,
      "editor.inactiveSelectionBackground": `${accent}20`,
      "editor.lineHighlightBackground": raised,
      "editor.lineHighlightBorder": "#00000000",
      "editorIndentGuide.background1": line,
      "editorIndentGuide.activeBackground1": subtle,
      "editorWhitespace.foreground": line,
      "editorWidget.background": raised,
      "editorWidget.border": line,
      "editorHoverWidget.background": raised,
      "editorHoverWidget.border": line,
      "editorSuggestWidget.background": raised,
      "editorSuggestWidget.border": line,
      "scrollbarSlider.background": `${line}cc`,
      "scrollbarSlider.hoverBackground": `${subtle}80`,
      "scrollbarSlider.activeBackground": `${subtle}b0`,
      "editorOverviewRuler.border": "#00000000",
      "editorGutter.background": bg,
    },
  });

  monaco.editor.setTheme(NOESIS_THEME);
}
