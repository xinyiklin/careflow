export function RegistrationSectionShell({
  icon: Icon,
  title,
  badge = null,
  className = "",
  children,
}) {
  return (
    <article
      className={[
        "overflow-hidden rounded-3xl border border-cf-border bg-cf-surface shadow-sm",
        className,
      ].join(" ")}
    >
      <div className="flex items-center justify-between border-b border-cf-border bg-cf-surface-muted/55 px-5 py-3">
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="h-4 w-4 text-cf-text-subtle" /> : null}
          <h4 className="text-sm font-semibold tracking-tight">{title}</h4>
          {badge}
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </article>
  );
}

export function ReadOnlyRegistrationRow({ label, value }) {
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
