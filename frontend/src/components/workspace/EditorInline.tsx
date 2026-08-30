"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { editor as MonacoEditorNS } from "monaco-editor";

/** ContentWidgetPositionPreference.EXACT — pin to the position, don't float above it. */
const EXACT = 0;

/**
 * React rendered inline on a code line, anchored past the end of the text.
 *
 * The obvious mechanism for this is decoration injected text (`after`), and
 * that is what this used to be — but it renders nothing in the bundled Monaco
 * (0.56): a control decoration with a plain `className` paints, the same
 * decoration with `after` produces no DOM node at all. Content widgets are the
 * supported alternative, and anchoring them past the last column keeps the one
 * property injected text would have given for free: a label can never come to
 * rest on top of code.
 */
export function EditorInline({
  editor,
  id,
  lineNumber,
  column,
  children,
}: {
  editor: MonacoEditorNS.IStandaloneCodeEditor;
  id: string;
  lineNumber: number;
  column: number;
  children: ReactNode;
}) {
  const [host] = useState(() => {
    const node = document.createElement("div");
    node.className = "noesis-inline-host";
    return node;
  });

  useLayoutEffect(() => {
    const widget: MonacoEditorNS.IContentWidget = {
      getId: () => `noesis.inline.${id}`,
      getDomNode: () => host,
      getPosition: () => ({
        position: { lineNumber, column },
        preference: [EXACT],
      }),
      // Widgets must not steal the caret when the user clicks near them.
      afterRender: () => undefined,
    };
    editor.addContentWidget(widget);
    return () => editor.removeContentWidget(widget);
  }, [editor, id, lineNumber, column, host]);

  return createPortal(children, host);
}
