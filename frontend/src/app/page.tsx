import Link from "next/link";
import { api } from "@/lib/api";
import { Bar, Panel } from "@/components/ui";
import type { ConceptNode, Lesson } from "@/lib/types";

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

export default async function Dashboard() {
  const [lessons, concepts] = await Promise.all([
    safe<Lesson[]>(api.listLessons(), []),
    safe<ConceptNode[]>(api.listConcepts(), []),
  ]);
  const next = lessons[0];

  return (
    <div className="mx-auto max-w-4xl px-8 py-12">
      <h1 className="text-2xl font-medium text-fg">Good afternoon.</h1>
      <p className="mt-1 text-sm text-muted">Continue where you left off.</p>

      {next ? (
        <Panel className="mt-8" title={next.track}>
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-lg text-fg">{next.unit}</div>
              <div className="mt-3 w-64">
                <Bar value={0.15} />
              </div>
              <div className="mt-1 text-xs text-muted">just getting started</div>
            </div>
            <Link
              href="/learn"
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-ink-900 hover:opacity-90"
            >
              Continue
            </Link>
          </div>
        </Panel>
      ) : (
        <Panel className="mt-8">
          <p className="text-sm text-muted">
            Backend not reachable. Start it with{" "}
            <code className="font-mono text-fg">uv run uvicorn app.main:app --reload</code>.
          </p>
        </Panel>
      )}

      <h2 className="mt-10 text-sm font-medium text-muted">Your concepts</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {concepts.slice(0, 6).map((c) => (
          <div key={c.id} className="rounded-lg border border-line bg-ink-800 p-4">
            <div className="text-sm text-fg">{c.label}</div>
            <div className="mt-3">
              <Bar value={0} />
            </div>
            <div className="mt-1 text-xs text-muted">not assessed</div>
          </div>
        ))}
      </div>
    </div>
  );
}
