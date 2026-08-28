import { cn, pct } from "@/lib/utils";

export type Tone = "accent" | "success" | "warning" | "danger" | "neutral";

const TONE_BG: Record<Tone, string> = {
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-fg-subtle",
};

export function ProgressBar({
  value,
  tone = "accent",
  className,
  size = "md",
  label,
}: {
  /** 0..1 */
  value: number;
  tone?: Tone;
  className?: string;
  size?: "sm" | "md";
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-line",
        size === "sm" ? "h-1" : "h-1.5",
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn("h-full origin-left rounded-full transition-[width] duration-500 ease-out", TONE_BG[tone])}
        style={{ width: pct(clamped) }}
      />
    </div>
  );
}

/**
 * Segmented meter — reads as a measurement rather than a filling XP bar, which
 * is why it is used for concept mastery.
 */
export function MasteryMeter({
  value,
  tone = "accent",
  segments = 10,
  className,
}: {
  value: number;
  tone?: Tone;
  segments?: number;
  className?: string;
}) {
  const filled = Math.round(Math.max(0, Math.min(1, value)) * segments);
  return (
    <div className={cn("flex gap-[3px]", className)} aria-hidden>
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-[1px] transition-colors duration-300",
            i < filled ? TONE_BG[tone] : "bg-line",
          )}
        />
      ))}
    </div>
  );
}
