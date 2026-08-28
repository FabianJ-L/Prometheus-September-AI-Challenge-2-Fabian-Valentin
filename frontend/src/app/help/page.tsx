import { Page, PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

const STEPS = [
  { n: "01", label: "Predict", text: "Commit to what you think the code will do, before running it." },
  { n: "02", label: "Execute", text: "Step through the real execution, one line at a time." },
  { n: "03", label: "Compare", text: "See your model and the actual result side by side." },
  { n: "04", label: "Diagnose", text: "Locate the exact iteration where the two parted ways." },
  { n: "05", label: "Understand", text: "Answer a question aimed at the gap, not at the syntax." },
  { n: "06", label: "Practice", text: "Re-test the same concept on code you haven't seen." },
];

export default function HelpPage() {
  return (
    <Page width="narrow">
      <PageHeader
        title="How NOESIS works"
        description="NOESIS is not a code assistant. It builds a model of how you think a program runs, and works on the difference between that and reality."
        className="mb-8"
      />

      <ol className="space-y-0">
        {STEPS.map((s) => (
          <li key={s.n} className="flex gap-5 border-b border-line py-4 last:border-b-0">
            <span className="numeric shrink-0 font-mono text-[13px] text-fg-subtle">{s.n}</span>
            <div>
              <div className="text-[14px] font-medium text-fg">{s.label}</div>
              <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <Card className="mt-8">
        <CardHeader title="Why doesn't NOESIS give me the answer?" />
        <CardBody>
          <p className="text-[15px] leading-relaxed text-fg">
            Because getting the correct code is not the same as understanding why it works.
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-fg-muted">
            A tool that fixes your code leaves your model of the language exactly as wrong as it was
            before. NOESIS is built to change the model — which is slower once, and faster
            afterwards.
          </p>
        </CardBody>
      </Card>

      <Card className="mt-5">
        <CardHeader title="Keyboard" />
        <CardBody className="space-y-2.5">
          <Shortcut keys="← →" description="Step backward / forward through execution" />
          <Shortcut keys="Enter" description="Submit a prediction" />
        </CardBody>
      </Card>
    </Page>
  );
}

function Shortcut({ keys, description }: { keys: string; description: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[13px] text-fg-muted">{description}</span>
      <kbd className="rounded border border-line bg-raised px-2 py-0.5 font-mono text-[12px] text-fg">
        {keys}
      </kbd>
    </div>
  );
}
