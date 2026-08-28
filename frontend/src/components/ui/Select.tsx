"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Option<T extends string> {
  value: T;
  label: string;
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: ReadonlyArray<Option<T>>;
  onChange: (next: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(
          "h-8 w-full appearance-none rounded border border-line bg-raised pl-3 pr-8 text-[13px] text-fg",
          "transition-colors duration-150 hover:border-line-strong",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-subtle"
      />
    </div>
  );
}

export function RadioGroup<T extends string>({
  value,
  options,
  onChange,
  name,
}: {
  value: T;
  options: ReadonlyArray<Option<T> & { description?: string }>;
  onChange: (next: T) => void;
  name: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-col gap-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex items-start gap-2.5 rounded px-2 py-1.5 text-left transition-colors duration-150",
              active ? "bg-accent/10" : "hover:bg-raised",
            )}
          >
            <span
              className={cn(
                "mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors",
                active ? "border-accent" : "border-line-strong",
              )}
            >
              {active && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
            </span>
            <span className="min-w-0">
              <span className={cn("block text-[13px]", active ? "text-fg" : "text-fg-muted")}>
                {o.label}
              </span>
              {o.description && (
                <span className="mt-0.5 block text-[12px] leading-relaxed text-fg-subtle">
                  {o.description}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  min,
  max,
  label,
  suffix,
}: {
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  label: string;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-1 rounded border border-line bg-raised">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="h-8 w-8 text-fg-muted transition-colors hover:text-fg disabled:opacity-30"
      >
        −
      </button>
      <span className="numeric min-w-[3ch] text-center text-[13px] text-fg">
        {value}
        {suffix}
      </span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="h-8 w-8 text-fg-muted transition-colors hover:text-fg disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}
