import type { ReactNode } from "react";

import { Button } from "../../../shared/ui";

/**
 * Profile-internal UI helpers shared across the per-tab section components.
 * These are intentionally narrow and only useful for the profile feature's
 * layout. Form inputs themselves now come from `shared/ui` (Field, Input,
 * Select, Textarea).
 */

export function dash(value: string | null | undefined): string {
  if (value === null || value === undefined) return "-";
  const trimmed = String(value).trim();
  return trimmed === "" ? "-" : trimmed;
}

export type Row = { label: string; value: ReactNode };

export function RowList({ rows }: { rows: Row[] }) {
  return (
    <dl className="grid gap-3">
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-[8rem_1fr] items-baseline gap-3 text-sm"
        >
          <dt className="text-xs font-medium text-text-muted">{row.label}</dt>
          <dd className="text-text">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

type SectionHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

export function SectionHeader({
  title,
  description,
  actions,
}: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-text">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-sm text-text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </div>
  );
}

/** Read-only display field (matches Field layout, no input). */
export function ReadField({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <span className="text-sm text-text">{value}</span>
    </div>
  );
}

type SectionActionsProps = {
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  editLabel: string;
  cancelLabel: string;
  saveLabel: string;
  savingLabel: string;
};

/**
 * Edit / Save / Cancel button cluster used by every editable section.
 */
export function SectionActions({
  isEditing,
  isSaving,
  onEdit,
  onCancel,
  onSave,
  editLabel,
  cancelLabel,
  saveLabel,
  savingLabel,
}: SectionActionsProps) {
  if (!isEditing) {
    return (
      <Button variant="secondary" size="sm" onClick={onEdit}>
        {editLabel}
      </Button>
    );
  }
  return (
    <>
      <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
        {cancelLabel}
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={onSave}
        isLoading={isSaving}
        disabled={isSaving}
      >
        {isSaving ? savingLabel : saveLabel}
      </Button>
    </>
  );
}

/** Shared error banner for save failures. */
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-border bg-danger-soft px-3 py-2 text-sm text-danger"
    >
      {message}
    </div>
  );
}
