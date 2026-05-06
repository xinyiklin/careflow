import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type PanelProps = {
  icon?: LucideIcon | null;
  title?: ReactNode;
  description?: ReactNode;
  tone?: "default" | "subtle";
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
};

export default function Panel({
  icon: Icon = null,
  title,
  description,
  tone = "default",
  className = "",
  bodyClassName = "",
  children,
}: PanelProps) {
  return (
    <section
      data-tone={tone === "subtle" ? "subtle" : "default"}
      className={["cf-ui-panel p-5", className].join(" ")}
    >
      {(Icon || title || description) && (
        <div className="flex items-start gap-3">
          {Icon ? (
            <div className="mt-0.5 rounded-xl border border-cf-border bg-cf-surface-soft p-2 text-cf-text-subtle">
              <Icon className="h-4 w-4" />
            </div>
          ) : null}

          <div>
            {title ? (
              <h3 className="text-sm font-semibold text-cf-text">{title}</h3>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm text-cf-text-muted">{description}</p>
            ) : null}
          </div>
        </div>
      )}

      <div
        className={[
          Icon || title || description ? "mt-4" : "",
          bodyClassName,
        ].join(" ")}
      >
        {children}
      </div>
    </section>
  );
}
