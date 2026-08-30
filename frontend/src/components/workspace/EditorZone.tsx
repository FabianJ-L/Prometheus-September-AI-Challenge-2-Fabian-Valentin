"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { editor as MonacoEditorNS } from "monaco-editor";

/**
 * A block of React rendered *between* two lines of code.
 *
 * Monaco calls these view zones. They push the following lines down instead of
 * floating over them, which is the whole reason to use one: a note about line 4
 * must never cover line 5. The height is measured from the rendered content and
 * fed back to Monaco, so a note can be one line or five without anyone
 * hard-coding a pixel value.
 */
export function EditorZone({
  editor,
  afterLineNumber,
  children,
}: {
  editor: MonacoEditorNS.IStandaloneCodeEditor;
  afterLineNumber: number;
  children: ReactNode;
}) {
  const [host] = useState(() => {
    const node = document.createElement("div");
    node.className = "noesis-zone";
    return node;
  });
  const contentRef = useRef<HTMLDivElement | null>(null);
  const zoneRef = useRef<{ id: string; zone: MonacoEditorNS.IViewZone } | null>(null);

  useLayoutEffect(() => {
    const zone: MonacoEditorNS.IViewZone = {
      afterLineNumber,
      domNode: host,
      // Starts at the content's current height when re-mounting after a line
      // change, so an existing note doesn't flash to zero height first.
      heightInPx: contentRef.current?.offsetHeight ?? 0,
      suppressMouseDown: false,
    };

    let id = "";
    editor.changeViewZones((accessor) => {
      id = accessor.addZone(zone);
    });
    zoneRef.current = { id, zone };

    return () => {
      const current = zoneRef.current;
      zoneRef.current = null;
      if (current) {
        editor.changeViewZones((accessor) => accessor.removeZone(current.id));
      }
    };
  }, [editor, afterLineNumber, host]);

  // Content height is only known after React paints it; keep Monaco in sync.
  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;

    const sync = () => {
      const current = zoneRef.current;
      if (!current) return;
      const height = node.offsetHeight;
      if (height === current.zone.heightInPx) return;
      current.zone.heightInPx = height;
      editor.changeViewZones((accessor) => accessor.layoutZone(current.id));
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => observer.disconnect();
  }, [editor]);

  return createPortal(<div ref={contentRef}>{children}</div>, host);
}
