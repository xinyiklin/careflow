import { Button, ModalShell } from "../../../../shared/components/ui";

function joinClasses(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function getReadablePreviewTextColor(color) {
  if (typeof color !== "string") return "white";
  const hex = color.trim().replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return "white";
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.58 ? "rgba(15, 23, 42, 0.94)" : "white";
}

export function AdminFormModal({
  isOpen,
  onClose,
  scope,
  title,
  description = "",
  maxWidth = "2xl",
  formId,
  saving = false,
  deleteLabel = "",
  onDelete,
  children,
}) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      eyebrow={scope}
      title={title}
      description={description}
      maxWidth={maxWidth}
      panelClassName="cf-admin-record-modal rounded-[1.55rem] border-cf-border-strong bg-cf-page-bg"
      bodyClassName="bg-cf-page-bg px-5 py-5"
      footerClassName="justify-between bg-cf-surface"
      footer={
        <>
          {onDelete && deleteLabel ? (
            <div className="mr-auto">
              <Button
                variant="danger"
                type="button"
                onClick={onDelete}
                disabled={saving}
              >
                {deleteLabel}
              </Button>
            </div>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="default"
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form={formId}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </>
      }
    >
      {children}
    </ModalShell>
  );
}

export function AdminFormSection({ title, children, className = "" }) {
  return (
    <section
      className={joinClasses(
        "rounded-[1.25rem] border border-cf-border bg-cf-surface shadow-[var(--shadow-panel)]",
        className
      )}
    >
      {title ? (
        <h3 className="rounded-t-[1.2rem] border-b border-cf-border bg-cf-surface-soft/45 px-4 py-3 text-sm font-semibold tracking-tight text-cf-text">
          {title}
        </h3>
      ) : null}
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

export function AdminField({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-cf-text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

export function AdminToggleField({
  label,
  description = "",
  name,
  checked,
  onChange,
  disabled = false,
}) {
  return (
    <label className="flex w-full items-center justify-between gap-4 rounded-2xl border border-cf-border bg-cf-surface-soft/60 px-4 py-3 transition hover:bg-cf-surface-soft">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-cf-text">
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-5 text-cf-text-subtle">
            {description}
          </span>
        ) : null}
      </span>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-cf-border-strong transition peer-checked:bg-cf-accent peer-disabled:opacity-50" />
        <span className="absolute left-1 h-4 w-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function AdminRecordPreview({
  eyebrow,
  title,
  description,
  meta = [],
  color = "var(--color-cf-accent)",
  children,
}) {
  return (
    <section className="rounded-[1.25rem] border border-cf-border bg-gradient-to-br from-cf-surface to-cf-surface-soft/55 p-4 shadow-[var(--shadow-panel)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-xs font-bold uppercase text-white shadow-sm ring-1 ring-black/5"
            style={{
              backgroundColor: color,
              color: getReadablePreviewTextColor(color),
            }}
          >
            {(title || eyebrow || "CF").slice(0, 2)}
          </span>
          <div className="min-w-0">
            {eyebrow ? (
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
                {eyebrow}
              </div>
            ) : null}
            <div className="truncate text-base font-semibold text-cf-text">
              {title || "Untitled"}
            </div>
            {description ? (
              <div className="mt-1 text-sm text-cf-text-muted">
                {description}
              </div>
            ) : null}
          </div>
        </div>
        {meta.length ? (
          <div className="flex flex-wrap justify-end gap-2">
            {meta.map((item) => (
              <span
                key={item}
                className="rounded-full border border-cf-border bg-cf-surface px-2.5 py-1 text-xs font-semibold text-cf-text-muted"
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
