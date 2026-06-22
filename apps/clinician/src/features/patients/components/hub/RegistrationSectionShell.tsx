import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type RegistrationSectionShellProps = {
  icon?: LucideIcon;
  title: string;
  badge?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
};

export function RegistrationSectionShell({
  icon: Icon,
  title,
  badge = null,
  className = "",
  bodyClassName = "",
  children,
}: RegistrationSectionShellProps) {
  return (
    <article
      className={[
        // No overflow-hidden here: it would clip an opened <select> dropdown at
        // the card edge. The header rounds its own top corners instead.
        "flex h-full flex-col rounded-2xl border border-cf-border bg-cf-surface shadow-sm",
        className,
      ].join(" ")}
    >
      <div className="flex items-center justify-between rounded-t-2xl border-b border-cf-border bg-cf-surface-muted/55 px-4 py-2">
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="h-3.5 w-3.5 text-cf-text-subtle" /> : null}
          <h4 className="text-sm font-semibold tracking-tight">{title}</h4>
          {badge}
        </div>
      </div>
      <div className={["flex-1 px-4 py-2.5", bodyClassName].join(" ")}>
        {children}
      </div>
    </article>
  );
}
