import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex items-start justify-between gap-6", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="label-caps mb-1.5">{eyebrow}</div>}
        <h1 className="text-[19px] font-medium leading-tight tracking-[-0.01em] text-fg">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-fg-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Standard page shell: consistent max width, padding and entry animation. */
export function Page({
  children,
  width = "default",
  className,
}: {
  children: ReactNode;
  width?: "default" | "wide" | "narrow";
  className?: string;
}) {
  const widths = {
    narrow: "max-w-2xl",
    default: "max-w-5xl",
    wide: "max-w-[1240px]",
  };
  return (
    <div className={cn("mx-auto w-full px-8 py-10 animate-fade-up", widths[width], className)}>
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  actions,
  className,
}: {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-4", className)}>
      <h2 className="label-caps">{children}</h2>
      {actions}
    </div>
  );
}
