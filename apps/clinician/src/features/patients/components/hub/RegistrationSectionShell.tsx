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

type ReadOnlyRegistrationRowProps = {
  label: string;
  value?: ReactNode;
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
        "flex h-full flex-col overflow-hidden rounded-2xl border border-cf-border bg-cf-surface shadow-sm",
        className,
      ].join(" ")}
    >
      <div className="flex items-center justify-between border-b border-cf-border bg-cf-surface-muted/55 px-4 py-2.5">
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="h-3.5 w-3.5 text-cf-text-subtle" /> : null}
          <h4 className="text-sm font-semibold tracking-tight">{title}</h4>
          {badge}
        </div>
      </div>
      <div className={["flex-1 px-4 py-3", bodyClassName].join(" ")}>
        {children}
      </div>
    </article>
  );
}

export function ReadOnlyRegistrationRow({
  label,
  value,
}: ReadOnlyRegistrationRowProps) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-medium text-cf-text">
        {value || <span className="text-cf-text-subtle">Add</span>}
      </div>
    </div>
  );
}
