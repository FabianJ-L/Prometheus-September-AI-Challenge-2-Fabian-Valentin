"use client";

import { cn } from "@/lib/utils";
import { deref, formatValue, isRef, reachable } from "@/lib/values";
import type { Heap, HeapObject, TraceValue } from "@/lib/types";

/**
 * Names on the left, the objects they point at on the right.
 *
 * The whole point is the many-to-one case: when two names sit on the same
 * object card, "b = a didn't copy anything" stops being a sentence someone has
 * to believe and becomes something they can see. Objects carry their names as
 * chips rather than being wired up with arrows — the binding reads the same at
 * any width, which matters because this renders inside the editor, in a column
 * whose width nobody controls.
 */

function Chip({ name, shared }: { name: string; shared: boolean }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 font-mono text-[11px] leading-none",
        shared ? "bg-accent text-accent-fg" : "bg-raised text-fg-muted",
      )}
    >
      {name}
    </span>
  );
}

function Cell({ value, heap }: { value: TraceValue; heap: Heap }) {
  if (isRef(value)) {
    const target = deref(value, heap);
    return (
      <span className="rounded border border-dashed border-line-strong px-1.5 py-0.5 font-mono text-[11px] text-fg-subtle">
        → {target?.type ?? "?"} {value.$ref}
      </span>
    );
  }
  return (
    <span className="rounded bg-bg px-1.5 py-0.5 font-mono text-[11.5px] text-fg">
      {formatValue(value, heap)}
    </span>
  );
}

function ObjectCard({
  object,
  names,
  heap,
}: {
  object: HeapObject;
  names: string[];
  heap: Heap;
}) {
  const shared = names.length > 1;
  return (
    <div
      className={cn(
        "rounded-md border bg-surface",
        shared ? "border-accent/50" : "border-line",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-2.5 py-1.5">
        {names.map((name) => (
          <Chip key={name} name={name} shared={shared} />
        ))}
        {names.length === 0 && (
          <span className="font-mono text-[11px] text-fg-subtle">(kein Name)</span>
        )}
        <span className="ml-auto font-mono text-[10.5px] uppercase tracking-wider text-fg-subtle">
          {object.type}
          {object.size > 0 && ` · ${object.size}`}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1 px-2.5 py-2">
        {object.elements?.map((element, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <Cell value={element} heap={heap} />
            <span className="font-mono text-[9.5px] text-fg-subtle">{i}</span>
          </div>
        ))}

        {object.entries?.map((entry) => (
          <div key={entry.key} className="flex items-center gap-1">
            <span className="font-mono text-[11.5px] text-fg-muted">{entry.key}:</span>
            <Cell value={entry.value} heap={heap} />
          </div>
        ))}

        {!object.elements && !object.entries && (
          <span className="font-mono text-[11.5px] text-fg-muted">{object.preview}</span>
        )}

        {object.truncated && (
          <span className="font-mono text-[10.5px] text-fg-subtle">… gekürzt</span>
        )}
      </div>

      {shared && (
        <p className="border-t border-line px-2.5 py-1.5 text-[11.5px] leading-snug text-fg-muted">
          <span className="font-medium text-accent">Ein Objekt, {names.length} Namen.</span>{" "}
          Eine Änderung über den einen Namen ist über die anderen sichtbar.
        </p>
      )}
    </div>
  );
}

export function MemoryDiagram({
  bindings,
  heap,
  focus,
  className,
}: {
  bindings: Record<string, TraceValue>;
  heap: Heap;
  /** Restrict to these names. Empty means everything in scope. */
  focus?: string[];
  className?: string;
}) {
  const names = focus && focus.length > 0 ? focus.filter((n) => n in bindings) : Object.keys(bindings);
  const visible = Object.fromEntries(names.map((n) => [n, bindings[n]]));

  const primitives = names.filter((n) => !isRef(visible[n]));
  const objects = reachable(visible, heap);

  const namesByObject = new Map<string, string[]>();
  for (const name of names) {
    const value = visible[name];
    if (isRef(value)) {
      namesByObject.set(value.$ref, [...(namesByObject.get(value.$ref) ?? []), name]);
    }
  }

  if (names.length === 0) {
    return (
      <p className={cn("font-mono text-[12px] text-fg-subtle", className)}>
        Keine Variablen an dieser Stelle.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {primitives.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-line bg-surface px-2.5 py-2">
          {primitives.map((name) => (
            <span key={name} className="flex items-center gap-1.5">
              <span className="font-mono text-[11.5px] text-fg-muted">{name}</span>
              <span className="text-fg-subtle">=</span>
              <span className="font-mono text-[11.5px] text-fg">
                {formatValue(visible[name], heap)}
              </span>
            </span>
          ))}
        </div>
      )}

      {objects.map((object) => (
        <ObjectCard
          key={object.id}
          object={object}
          names={namesByObject.get(object.id) ?? []}
          heap={heap}
        />
      ))}
    </div>
  );
}
