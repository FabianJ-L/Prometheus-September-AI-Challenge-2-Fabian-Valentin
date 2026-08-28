import { api } from "@/lib/api";
import { Bar, Panel } from "@/components/ui";
import type { ConceptNode } from "@/lib/types";

export default async function PracticePage() {
  let concepts: ConceptNode[] = [];
  try {
    concepts = await api.listConcepts();
  } catch {
    /* backend down — render empty */
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-12">
      <h1 className="text-xl text-fg">Practice</h1>
      <p className="mt-1 text-sm text-muted">Target a concept. NOESIS recommends based on recent misconceptions.</p>

      <Panel className="mt-6" title="Recommended">
        <p className="text-sm text-fg">
          Complete a few lessons in <span className="text-accent">Learn</span> — recommendations appear once the
          student model has evidence.
        </p>
      </Panel>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {concepts.map((c) => (
          <button
            key={c.id}
            className="rounded-lg border border-line bg-ink-800 p-4 text-left hover:border-accent"
          >
            <div className="text-sm text-fg">{c.label}</div>
            <div className="mt-3">
              <Bar value={0} />
            </div>
            <div className="mt-1 text-xs text-muted">not assessed</div>
          </button>
        ))}
      </div>
    </div>
  );
}
