import type { ReactNode } from "react";

import { cn } from "./cn";

export type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info";

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: "bg-surface-soft text-text-muted",
  accent: "bg-accent-soft text-accent",
  info: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  title?: string;
  className?: string;
};

export function Badge({
  children,
  tone = "neutral",
  title,
  className,
}: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-medium tracking-tight",
        TONE_CLASS[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
