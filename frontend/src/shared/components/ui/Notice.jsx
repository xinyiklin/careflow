import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";

const TONE_STYLES = {
  danger: {
    icon: AlertCircle,
    className: "border-cf-danger-bg bg-cf-danger-bg text-cf-danger-text",
  },
  warning: {
    icon: TriangleAlert,
    className: "border-amber-200 bg-amber-50 text-amber-900",
  },
  success: {
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  info: {
    icon: Info,
    className: "border-cf-border bg-cf-surface-muted text-cf-text-muted",
  },
};

export default function Notice({
  tone = "info",
  title,
  children,
  className = "",
}) {
  if (!children && !title) return null;

  const config = TONE_STYLES[tone] || TONE_STYLES.info;
  const Icon = config.icon;

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={[
        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
        config.className,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        {title ? <div className="font-semibold">{title}</div> : null}
        {children ? (
          <div className={title ? "mt-0.5" : ""}>{children}</div>
        ) : null}
      </div>
    </div>
  );
}
