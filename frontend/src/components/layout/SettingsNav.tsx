"use client";

import { cn } from "@/lib/utils";

export const SETTINGS_SECTIONS = [
  { id: "general", label: "General" },
  { id: "appearance", label: "Appearance" },
  { id: "learning", label: "Learning" },
  { id: "ai-teacher", label: "AI Teacher" },
  { id: "code", label: "Code" },
  { id: "privacy", label: "Privacy" },
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]["id"];

export function SettingsNav({
  active,
  onSelect,
}: {
  active: SettingsSection;
  onSelect: (id: SettingsSection) => void;
}) {
  return (
    <nav aria-label="Settings sections" className="flex gap-1 lg:flex-col">
      {SETTINGS_SECTIONS.map((s) => (
        <button
          key={s.id}
          type="button"
          aria-current={active === s.id ? "true" : undefined}
          onClick={() => onSelect(s.id)}
          className={cn(
            "h-8 shrink-0 rounded px-3 text-left text-[13px] transition-colors duration-150",
            active === s.id
              ? "bg-accent/10 text-fg"
              : "text-fg-muted hover:bg-raised hover:text-fg",
          )}
        >
          {s.label}
        </button>
      ))}
    </nav>
  );
}
