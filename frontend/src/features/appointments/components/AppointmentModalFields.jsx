export function ReadOnlyValueField({ value }) {
  return (
    <div className="min-h-10 rounded-xl border border-cf-border bg-cf-surface-muted/60 px-3 py-2.5 text-sm font-medium text-cf-text">
      {value || "—"}
    </div>
  );
}

export function FieldLabel({ children, required = false }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-cf-text-subtle">
      {children}
      {required ? <span className="ml-1 text-cf-danger-text">*</span> : null}
    </label>
  );
}

export function FormSection({ icon: Icon, title, description, children }) {
  return (
    <section className="border-t border-cf-border px-7 py-6 first:border-t-0">
      <div className="flex items-start gap-2">
        {Icon ? <Icon className="mt-0.5 h-4 w-4 text-cf-text-subtle" /> : null}
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-cf-text">
            {title}
          </h3>
          {description ? (
            <p className="mt-0.5 text-xs text-cf-text-muted">{description}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SummaryItem({ label, value, swatchColor = null }) {
  return (
    <div className="rounded-xl border border-cf-border bg-cf-surface px-3 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
        {label}
      </div>
      <div className="mt-1 flex min-h-5 items-center gap-2 text-sm font-medium text-cf-text">
        {swatchColor ? (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: swatchColor }}
          />
        ) : null}
        <span className="min-w-0 truncate">{value || "—"}</span>
      </div>
    </div>
  );
}

export function ChipPicker({
  label,
  options,
  value,
  onChange,
  required = false,
  error = "",
  getMeta = null,
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = String(option.id) === String(value);
          const color = option.color || "var(--color-cf-accent)";
          const meta = getMeta?.(option);

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition",
                isActive
                  ? label === "Status"
                    ? "border-2 border-amber-500 bg-amber-50 font-semibold text-amber-900 shadow-[var(--shadow-panel)]"
                    : "border-2 border-cf-text bg-cf-text font-semibold text-white shadow-[var(--shadow-panel)]"
                  : "border-cf-border bg-cf-surface font-medium text-cf-text-muted hover:bg-cf-surface-soft",
              ].join(" ")}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              {option.name}
              {meta ? <span>· {meta}</span> : null}
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="mt-1 text-sm text-cf-danger-text">{error}</p>
      ) : null}
    </div>
  );
}

export function PatientMetaItem({
  label,
  value,
  className = "",
  multiline = false,
}) {
  return (
    <div
      className={[
        "min-w-0 rounded-xl border border-cf-border bg-cf-surface-muted/55 px-3 py-2",
        className,
      ].join(" ")}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
        {label}
      </div>
      <div
        className={[
          "mt-0.5 min-h-5 text-sm font-medium text-cf-text",
          multiline ? "leading-snug" : "truncate",
        ].join(" ")}
      >
        {value || "—"}
      </div>
    </div>
  );
}
