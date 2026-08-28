import { Panel } from "@/components/ui";

// Placeholder — see docs/ARCHITECTURE.md §Settings for the full surface
// (General / Appearance / Learning / AI Teacher / Code / Privacy).
export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl px-8 py-12">
      <h1 className="text-xl text-fg">Settings</h1>
      <Panel className="mt-6" title="Learning">
        <div className="space-y-4 text-sm">
          <Row label="Teaching style" value="Guided" />
          <Row label="Difficulty adaptation" value="Automatic" />
          <Row label="Prediction mode" value="Always ask" />
          <Row label="Show misconceptions" value="Immediately" />
        </div>
      </Panel>
      <Panel className="mt-4" title="AI teacher">
        <div className="space-y-4 text-sm">
          <Row label="Never give me the solution" value="On" />
          <Row label="Ask before explaining" value="On" />
          <Row label="Max hint level" value="Concept → Strategy" />
        </div>
      </Panel>
      <p className="mt-4 text-xs text-muted">Controls are not wired yet — this is the intended surface.</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line pb-3">
      <span className="text-muted">{label}</span>
      <span className="text-fg">{value}</span>
    </div>
  );
}
