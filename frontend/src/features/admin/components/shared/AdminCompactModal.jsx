function joinClasses(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function CompactModalGrid({ children, className = "" }) {
  return (
    <div
      className={joinClasses(
        "grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CompactModalLane({ children, className = "" }) {
  return (
    <section className={joinClasses("space-y-3", className)}>
      {children}
    </section>
  );
}

export function CompactCard({
  eyebrow = "",
  title = "",
  action = null,
  children,
  className = "",
}) {
  return (
    <section
      className={joinClasses(
        "rounded-2xl border border-cf-border bg-cf-surface p-3 shadow-[var(--shadow-panel)]",
        className
      )}
    >
      {eyebrow || title || action ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            {eyebrow ? (
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
                {eyebrow}
              </div>
            ) : null}
            {title ? (
              <div className="truncate text-base font-semibold text-cf-text">
                {title}
              </div>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function CompactField({ label, children, className = "" }) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
        {label}
      </span>
      {children}
    </label>
  );
}

export function CompactToggle({
  label,
  name,
  checked,
  onChange,
  className = "",
}) {
  return (
    <label
      className={joinClasses(
        "flex items-center justify-between gap-3 rounded-full border border-cf-border bg-cf-page-bg px-2.5 py-1 text-xs font-semibold text-cf-text-muted",
        className
      )}
    >
      <span>{label}</span>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-3.5 w-3.5 accent-[var(--color-cf-accent)]"
      />
    </label>
  );
}

export function CompactMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-cf-border bg-cf-surface-soft/60 px-3 py-2">
      <div className="text-lg font-semibold leading-none text-cf-text">
        {value}
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
        {label}
      </div>
    </div>
  );
}

export function CompactPill({ children, tone = "muted", className = "" }) {
  const toneClass =
    tone === "success"
      ? "bg-cf-success-bg text-cf-success-text ring-cf-success-text/20"
      : tone === "warning"
        ? "bg-cf-warning-bg text-cf-warning-text ring-cf-warning-text/20"
        : "bg-cf-surface-soft text-cf-text-muted ring-cf-border";

  return (
    <span
      className={joinClasses(
        "rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        toneClass,
        className
      )}
    >
      {children}
    </span>
  );
}

export function CompactRecordHeader({
  initials,
  title,
  meta,
  accent,
  action = null,
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cf-border bg-cf-surface-soft text-sm font-bold text-cf-text"
        style={accent ? { borderColor: accent } : undefined}
      >
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-semibold text-cf-text">
          {title}
        </div>
        {meta ? (
          <div className="mt-0.5 truncate text-sm text-cf-text-muted">
            {meta}
          </div>
        ) : null}
      </div>
      {action}
    </div>
  );
}
