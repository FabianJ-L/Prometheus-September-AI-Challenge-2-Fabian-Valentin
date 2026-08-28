"use client";

import { cn } from "@/lib/utils";

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-200",
        checked ? "border-accent bg-accent" : "border-line-strong bg-line",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-[left] duration-200 ease-out",
          checked ? "left-[18px] bg-accent-fg" : "left-[2px] bg-fg-subtle",
        )}
      />
    </button>
  );
}

/** Label + description on the left, control on the right. */
export function SettingRow({
  label,
  description,
  control,
}: {
  label: string;
  description?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-8 border-b border-line py-3.5 last:border-b-0">
      <div className="min-w-0">
        <div className="text-[13px] text-fg">{label}</div>
        {description && (
          <p className="mt-0.5 max-w-md text-[12px] leading-relaxed text-fg-muted">{description}</p>
        )}
      </div>
      <div className="shrink-0 pt-0.5">{control}</div>
    </div>
  );
}
