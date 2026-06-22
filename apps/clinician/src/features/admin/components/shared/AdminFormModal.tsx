import { Button, ModalShell } from "../../../../shared/components/ui";

import type { ChangeEventHandler, ReactNode } from "react";

type AdminModalMaxWidth = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function getReadablePreviewTextColor(color: unknown) {
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
  maxWidth = "2xl",
  formId,
  saving = false,
  deleteLabel = "",
  onDelete,
  bodyClassName = "",
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  scope: string;
  title: ReactNode;
  maxWidth?: AdminModalMaxWidth;
  formId: string;
  saving?: boolean;
  deleteLabel?: string;
  onDelete?: () => void;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      eyebrow={scope}
      title={title}
      description=""
      maxWidth={maxWidth}
      panelClassName={[
        "cf-admin-record-modal rounded-[var(--radius-cf-shell)] border-cf-border-strong bg-cf-surface shadow-[var(--shadow-panel-lg)]",
        "[&>div:first-child_p]:hidden",
      ].join(" ")}
      bodyClassName={
        bodyClassName ||
        "bg-cf-surface px-6 py-5 border-t border-b border-cf-border/60"
      }
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

export function AdminFormSection({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={joinClasses(
        "overflow-hidden rounded-2xl border border-cf-border bg-cf-surface shadow-[var(--shadow-panel)]",
        className
      )}
    >
      {title ? (
        <div className="border-b border-cf-border bg-cf-surface-soft/65 px-4 py-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
            {title}
          </h3>
        </div>
      ) : null}
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

// Admin form primitives stay here rather than shared/ui — they carry admin-specific label
// styling and are only consumed within features/admin modal forms.
export function AdminField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-cf-text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

export function AdminFieldGrid({
  children,
  columns = 2,
}: {
  children: ReactNode;
  columns?: 1 | 2;
}) {
  const columnClass =
    columns === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2";

  return (
    <div className={["grid gap-4", columnClass].join(" ")}>{children}</div>
  );
}

export function AdminToggleField({
  label,
  description = "",
  name,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description?: string;
  name: string;
  checked: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
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
