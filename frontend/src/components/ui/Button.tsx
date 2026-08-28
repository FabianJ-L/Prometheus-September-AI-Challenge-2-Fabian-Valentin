import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

/** One button height per size, everywhere in the product. */
const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
};

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-fg font-medium hover:brightness-110 active:brightness-95 disabled:hover:brightness-100",
  secondary:
    "bg-raised text-fg border border-line hover:border-line-strong hover:bg-line/40 disabled:hover:bg-raised",
  ghost: "text-fg-muted hover:text-fg hover:bg-raised",
  danger:
    "border border-danger/40 text-danger hover:bg-danger/10 disabled:hover:bg-transparent",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded transition-[background-color,border-color,filter,opacity] duration-150",
        "disabled:cursor-not-allowed disabled:opacity-40",
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
});
