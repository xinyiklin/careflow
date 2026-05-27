import type { CSSProperties, ReactNode } from "react";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: "bg-cf-surface-soft text-cf-text-muted",
  success: "bg-cf-success-bg text-cf-success-text",
  warning: "bg-cf-warning-bg text-cf-warning-text",
  danger: "bg-cf-danger-bg text-cf-danger-text",
  info: "bg-cf-accent-soft text-cf-text",
};

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  style?: CSSProperties;
  title?: string;
};

export function Badge({
  children,
  tone = "neutral",
  style,
  title,
}: BadgeProps) {
  return (
    <span
      title={title}
      style={style}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}
