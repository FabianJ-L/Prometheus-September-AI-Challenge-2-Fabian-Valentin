import { Panel } from "@/components/ui";

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl px-8 py-12">
      <h1 className="text-xl text-fg">How NOESIS works</h1>
      <ol className="mt-4 space-y-1 text-sm text-muted">
        {["Predict", "Execute", "Compare", "Diagnose", "Understand", "Practice"].map((s, i) => (
          <li key={s}>
            <span className="mr-2 text-fg">{i + 1}.</span>
            {s}
          </li>
        ))}
      </ol>

      <Panel className="mt-8" title="Why doesn't NOESIS give me the answer?">
        <p className="text-sm text-fg">
          Because getting the correct code is not the same as understanding why it works.
        </p>
      </Panel>
    </div>
  );
}
