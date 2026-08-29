"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, PanelLeftClose, PanelLeftOpen, Settings, SquareTerminal } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const PRIMARY = [{ href: "/", label: "Workspace", icon: SquareTerminal }] as const;

const SECONDARY = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help", icon: CircleHelp },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Collapse by default on narrow viewports; the learning split view needs room.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1100px)");
    const apply = () => setCollapsed(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" || pathname === "/learn" : pathname.startsWith(href);

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 ease-out",
        collapsed ? "w-[60px]" : "w-[248px]",
      )}
    >
      <div className={cn("flex h-14 items-center gap-2.5 px-4", collapsed && "justify-center px-0")}>
        <Logo />
        {!collapsed && (
          <span className="text-[13px] font-semibold tracking-[0.14em] text-fg">NOESIS</span>
        )}
      </div>

      <nav className="flex flex-col gap-0.5 px-2.5">
        {PRIMARY.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} collapsed={collapsed} />
        ))}
      </nav>

      <div className="mx-4 my-4 border-t border-line" />

      <nav className="flex flex-col gap-0.5 px-2.5">
        {SECONDARY.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} collapsed={collapsed} />
        ))}
      </nav>

      <div className="mt-auto px-2.5 pb-3">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "mb-2 flex h-8 w-full items-center gap-2.5 rounded px-2.5 text-fg-subtle transition-colors hover:bg-raised hover:text-fg",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          {!collapsed && <span className="text-[12px]">Collapse</span>}
        </button>

        <div
          className={cn(
            "flex items-center gap-2.5 rounded border border-line bg-raised px-2.5 py-2",
            collapsed && "justify-center border-0 bg-transparent px-0",
          )}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-medium text-accent">
            V
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-[12px] text-fg">Valentin</span>
              <span className="block text-[11px] text-fg-subtle">Python Fundamentals</span>
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: typeof SquareTerminal;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-8 items-center gap-2.5 rounded px-2.5 text-[13px] transition-colors duration-150",
        active ? "bg-accent/10 text-fg" : "text-fg-muted hover:bg-raised hover:text-fg",
        collapsed && "justify-center px-0",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r bg-accent" />
      )}
      <Icon size={16} className={active ? "text-accent" : ""} aria-hidden />
      {!collapsed && label}
    </Link>
  );
}

function Logo() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className="shrink-0">
      <circle cx="10" cy="10" r="8.25" stroke="rgb(var(--line-strong))" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="3.25" fill="rgb(var(--accent))" />
      <path d="M10 1.75V6.75" stroke="rgb(var(--accent))" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
