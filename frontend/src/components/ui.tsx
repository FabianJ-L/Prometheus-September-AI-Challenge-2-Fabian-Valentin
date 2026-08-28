import type { ReactNode } from "react";

export function Panel({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-line bg-ink-800 ${className}`}>
      {title && (
        <header className="border-b border-line px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-muted">
          {title}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Bar({ value, tone = "accent" }: { value: number; tone?: "accent" | "ok" | "diverge" }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const color = tone === "ok" ? "bg-ok" : tone === "diverge" ? "bg-diverge" : "bg-accent";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ink-600">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line bg-ink-700 px-1.5 py-0.5 font-mono text-[11px] text-muted">
      {children}
    </kbd>
  );
}
