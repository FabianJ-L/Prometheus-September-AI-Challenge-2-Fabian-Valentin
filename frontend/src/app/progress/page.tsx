import { api } from "@/lib/api";
import { Bar, Panel } from "@/components/ui";
import type { ConceptNode, ConceptState } from "@/lib/types";

export default async function ProgressPage() {
  let concepts: ConceptNode[] = [];
  let states: ConceptState[] = [];
  try {
    [concepts, states] = await Promise.all([api.listConcepts(), api.conceptState()]);
  } catch {
    /* backend down */
  }
  const byId = new Map(states.map((s) => [s.concept_id, s]));

  return (
    <div className="mx-auto max-w-3xl px-8 py-12">
      <h1 className="text-xl text-fg">Mental model</h1>
      <p className="mt-1 text-sm text-muted">A pedagogical diagnosis, not a scoreboard.</p>

      <Panel className="mt-6" title="Python Fundamentals">
        <div className="space-y-3">
          {concepts.map((c) => {
            const s = byId.get(c.id);
            const score = s?.score ?? 0;
            return (
              <div key={c.id} className="flex items-center gap-4">
                <span className="w-44 text-sm text-fg">{c.label}</span>
                <div className="flex-1">
                  <Bar value={score} tone={score >= 0.8 ? "ok" : score < 0.3 ? "diverge" : "accent"} />
                </div>
                <span className="w-24 text-right text-xs text-muted">
                  {s ? `${Math.round(score * 100)}%` : "not assessed"}
                </span>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel className="mt-6" title="Recent misconceptions">
        <p className="text-sm text-muted">
          Misconceptions detected during sessions will be listed here with their status (resolved / improving / needs
          practice).
        </p>
      </Panel>
    </div>
  );
}
