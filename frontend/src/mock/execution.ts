import type { ExecutionStep } from "@/lib/types";

/**
 * Builds an execution trace the way a step debugger would record one: after
 * every executed line, snapshot the whole visible scope and mark what changed.
 *
 * Traces are authored rather than interpreted — NOESIS ships a small, fixed set
 * of lessons, and a hand-built trace is exact and reviewable.
 */
export function traceBuilder() {
  const steps: ExecutionStep[] = [];
  const scope = new Map<string, string>();
  const stdout: string[] = [];

  const api = {
    /** Record one executed line. `set` are the bindings this line writes. */
    at(
      line: number,
      opts: {
        iteration?: number | null;
        set?: Record<string, string>;
        print?: string;
        callStack?: string[];
      } = {},
    ) {
      const written = Object.keys(opts.set ?? {});
      const previous = new Map(written.map((k) => [k, scope.get(k)]));
      for (const [name, value] of Object.entries(opts.set ?? {})) scope.set(name, value);
      if (opts.print !== undefined) stdout.push(opts.print);

      steps.push({
        index: steps.length,
        line,
        label: `Step ${steps.length + 1}`,
        iteration: opts.iteration ?? null,
        scope: [...scope.entries()].map(([name, value]) => ({
          name,
          value,
          changed: written.includes(name),
          previous: previous.get(name),
        })),
        stdout: [...stdout],
        callStack: opts.callStack ?? ["<module>"],
      });
      return api;
    },
    build: (): ExecutionStep[] => steps,
  };

  return api;
}

/**
 * numbers = [2, 4, 6]   ·   total = 0   ·   for number in numbers: total += number
 */
export const SUM_LIST_TRACE: ExecutionStep[] = traceBuilder()
  .at(1, { set: { numbers: "[2, 4, 6]" } })
  .at(2, { set: { total: "0" } })
  .at(4, { iteration: 1, set: { number: "2" } })
  .at(5, { iteration: 1, set: { total: "2" } })
  .at(4, { iteration: 2, set: { number: "4" } })
  .at(5, { iteration: 2, set: { total: "6" } })
  .at(4, { iteration: 3, set: { number: "6" } })
  .at(5, { iteration: 3, set: { total: "12" } })
  .at(7, { print: "12" })
  .build();

/**
 * The retest: same concept (accumulation inside a loop), different numbers.
 */
export const SUM_RETEST_TRACE: ExecutionStep[] = traceBuilder()
  .at(1, { set: { total: "0" } })
  .at(3, { iteration: 1, set: { value: "3" } })
  .at(4, { iteration: 1, set: { total: "3" } })
  .at(3, { iteration: 2, set: { value: "5" } })
  .at(4, { iteration: 2, set: { total: "8" } })
  .at(6, { print: "8" })
  .build();

/**
 * y = x, then x is rebound — does y follow?
 */
export const REBIND_TRACE: ExecutionStep[] = traceBuilder()
  .at(1, { set: { x: "10" } })
  .at(2, { set: { y: "10" } })
  .at(3, { set: { x: "99" } })
  .at(4, { print: "10" })
  .build();
