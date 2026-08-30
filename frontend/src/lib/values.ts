/**
 * Reading traced values.
 *
 * The executor hands back bindings that point into a per-step heap, so every
 * display of a value needs the heap alongside it. These helpers are the only
 * place that knows the `$ref` encoding.
 */

import type { Heap, HeapObject, TraceValue } from "@/lib/types";

export function isRef(value: TraceValue): value is { $ref: string } {
  return typeof value === "object" && value !== null && "$ref" in value;
}

export function deref(value: TraceValue, heap: Heap): HeapObject | null {
  return isRef(value) ? (heap[value.$ref] ?? null) : null;
}

/** One-line rendering, close to how Python would show it. */
export function formatValue(value: TraceValue, heap: Heap): string {
  if (isRef(value)) return deref(value, heap)?.preview ?? "…";
  if (typeof value === "string") return `"${value}"`;
  if (value === null) return "None";
  if (typeof value === "boolean") return value ? "True" : "False";
  return String(value);
}

/** Stable identity for change detection — refs compare by object, not content. */
export function valueKey(value: TraceValue): string {
  return isRef(value) ? `ref:${value.$ref}` : `val:${JSON.stringify(value)}`;
}

/**
 * True when the binding changed in a way worth pointing at: rebound to another
 * object, or the object it points at was mutated.
 */
export function hasChanged(
  name: string,
  current: Record<string, TraceValue>,
  currentHeap: Heap,
  previous: Record<string, TraceValue>,
  previousHeap: Heap,
): boolean {
  if (!(name in previous)) return false;
  const now = current[name];
  const before = previous[name];
  if (valueKey(now) !== valueKey(before)) return true;
  if (isRef(now)) {
    return deref(now, currentHeap)?.preview !== deref(before, previousHeap)?.preview;
  }
  return false;
}

/** Names grouped by the object they share, for groups larger than one. */
export function aliasGroups(bindings: Record<string, TraceValue>): string[][] {
  const byRef = new Map<string, string[]>();
  for (const [name, value] of Object.entries(bindings)) {
    if (!isRef(value)) continue;
    const names = byRef.get(value.$ref) ?? [];
    names.push(name);
    byRef.set(value.$ref, names);
  }
  return [...byRef.values()].filter((names) => names.length > 1);
}

/** Every heap object reachable from `bindings`, nearest first. */
export function reachable(bindings: Record<string, TraceValue>, heap: Heap): HeapObject[] {
  const seen = new Set<string>();
  const ordered: HeapObject[] = [];
  const queue: TraceValue[] = Object.values(bindings);

  while (queue.length > 0) {
    const value = queue.shift() as TraceValue;
    if (!isRef(value) || seen.has(value.$ref)) continue;
    seen.add(value.$ref);
    const object = heap[value.$ref];
    if (!object) continue;
    ordered.push(object);
    if (object.elements) queue.push(...object.elements);
    if (object.entries) queue.push(...object.entries.map((e) => e.value));
  }
  return ordered;
}
