"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Learn", glyph: "◈" },
  { href: "/practice", label: "Practice", glyph: "▣" },
  { href: "/progress", label: "Progress", glyph: "◎" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-ink-800 px-4 py-6">
      <div className="mb-8 flex items-center gap-2 px-2">
        <span className="text-accent">◉</span>
        <span className="font-mono text-sm tracking-widest text-fg">NOESIS</span>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors",
                active ? "bg-accent-soft text-fg" : "text-muted hover:bg-ink-700 hover:text-fg",
              ].join(" ")}
            >
              <span className="text-xs">{item.glyph}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="my-6 border-t border-line" />

      <nav className="flex flex-col gap-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded px-3 py-2 text-sm text-muted hover:bg-ink-700 hover:text-fg"
        >
          <span className="text-xs">⚙</span> Settings
        </Link>
        <Link
          href="/help"
          className="flex items-center gap-3 rounded px-3 py-2 text-sm text-muted hover:bg-ink-700 hover:text-fg"
        >
          <span className="text-xs">?</span> Help
        </Link>
      </nav>

      <div className="mt-auto border-t border-line pt-4 px-3 text-xs text-muted">Anonymous learner</div>
    </aside>
  );
}
