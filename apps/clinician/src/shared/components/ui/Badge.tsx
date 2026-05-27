import type { HTMLAttributes, ReactNode } from "react";

const variants = {
  neutral: "bg-cf-surface-soft text-cf-text-muted",
  outline: "border border-cf-border bg-cf-surface text-cf-text-muted",
  success: "bg-cf-success-bg text-cf-success-text",
  warning: "bg-cf-warning-bg text-cf-warning-text",
  danger: "bg-cf-danger-bg text-cf-danger-text",
  muted: "bg-cf-surface-soft text-cf-text-subtle",
};

const sizes = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
};

type BadgeVariant = keyof typeof variants;
type BadgeSize = keyof typeof sizes;

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children?: ReactNode;
};

export default function Badge({
  variant = "neutral",
  size = "sm",
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full font-medium",
        variants[variant] ?? variants.neutral,
        sizes[size] ?? sizes.sm,
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}
