"use client";

import type { ReactNode, ButtonHTMLAttributes } from "react";

type Size = "sm" | "md";
type Variant = "ghost" | "outline";

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  "aria-label": string;
  children: ReactNode;
  size?: Size;
  variant?: Variant;
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "size-7",
  md: "size-9",
};

const VARIANT_CLASSES: Record<Variant, string> = {
  ghost:
    "border-transparent bg-transparent hover:bg-muted hover:text-foreground",
  outline:
    "border-border bg-card hover:bg-muted hover:text-foreground",
};

export default function IconButton({
  "aria-label": ariaLabel,
  children,
  size = "md",
  variant = "ghost",
  className = "",
  disabled,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center rounded-md border text-muted-foreground transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        "disabled:pointer-events-none disabled:opacity-50",
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
