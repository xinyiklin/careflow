import { useContext, useId } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import {
  Badge,
  Button,
  SegmentedControl,
} from "../../../../shared/components/ui";
import AdminToolbarSlotContext from "./AdminToolbarSlotContext";

import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import type { AdminConfirmVariant, AdminListFilterOption } from "../../types";

export { default as AdminWorkspaceShell } from "./AdminWorkspaceShell";

export const ADMIN_INTERACTIVE_ROW_CLASS =
  "group cursor-pointer outline-none transition hover:bg-cf-surface-soft/50 focus-visible:bg-cf-surface-soft/75 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cf-accent/30";

type AdminRowActionProps = {
  disabled?: boolean;
  label: string;
  onAction?: (event: MouseEvent | KeyboardEvent) => void;
  className?: string;
};

export function getAdminRowActionProps({
  disabled = false,
  label,
  onAction,
  className = "",
}: AdminRowActionProps) {
  if (disabled) {
    return {
      "aria-disabled": true,
      className: ["group transition", className].filter(Boolean).join(" "),
    };
  }

  return {
    role: "button",
    tabIndex: 0,
    "aria-label": label,
    onClick: onAction,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onAction?.(event);
    },
    className: [ADMIN_INTERACTIVE_ROW_CLASS, className]
      .filter(Boolean)
      .join(" "),
  };
}

export function AdminTableCard({
  title = "",
  savingLabel = "",
  actions = null,
  children,
}: {
  title?: string;
  description?: string;
  savingLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const toolbarSlot = useContext(AdminToolbarSlotContext);
  const useSharedToolbar = Boolean(toolbarSlot && (savingLabel || actions));

  const toolbarContent =
    savingLabel || actions ? (
      <>
        {savingLabel ? <Badge variant="muted">{savingLabel}</Badge> : null}
        {actions}
      </>
    ) : null;

  return (
    <section className="cf-admin-table-card">
      {useSharedToolbar && toolbarContent && toolbarSlot
        ? createPortal(toolbarContent, toolbarSlot)
        : null}
      {title || (!useSharedToolbar && (savingLabel || actions)) ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cf-border bg-cf-surface px-3 py-3">
          {title ? (
            <h3 className="text-sm font-semibold tracking-tight text-cf-text">
              {title}
            </h3>
          ) : (
            <div />
          )}

          {!useSharedToolbar && (savingLabel || actions) ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {toolbarContent}
            </div>
          ) : null}
        </div>
      ) : null}

      {children}
    </section>
  );
}

export function AdminListToolbar({
  filters = [],
  activeFilter = filters[0]?.key || filters[0]?.label || "",
  onFilterChange,
  sortOptions = [],
  activeSort = sortOptions[0]?.key || "",
  onSortChange,
  sortLabel = "Name",
  savingLabel = "",
  actions = null,
  children = null,
}: {
  filters?: AdminListFilterOption[];
  activeFilter?: string;
  onFilterChange?: (key: string) => void;
  sortOptions?: Array<{ key: string; label: string }>;
  activeSort?: string;
  onSortChange?: (key: string) => void;
  sortLabel?: string;
  savingLabel?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const toolbarSlot = useContext(AdminToolbarSlotContext);
  const sortSelectId = useId();
  const hasInteractiveSort = Boolean(onSortChange && sortOptions.length);

  const filterOptions = filters.map(({ key, label }) => ({
    value: key || label,
    label,
  }));

  const content = (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {filterOptions.length ? (
          <SegmentedControl
            options={filterOptions}
            value={activeFilter}
            onChange={(value) => onFilterChange?.(value)}
            size="xs"
            variant="pill"
          />
        ) : null}
        {hasInteractiveSort ? (
          <>
            {filterOptions.length ? (
              <span className="mx-1 h-4 w-px bg-cf-border" />
            ) : null}
            <div className="flex items-center gap-2 text-xs">
              <label htmlFor={sortSelectId} className="text-cf-text-subtle">
                Sort:
              </label>
              <div className="relative flex items-center">
                <select
                  id={sortSelectId}
                  value={activeSort}
                  onChange={(event) => onSortChange?.(event.target.value)}
                  className="h-7 appearance-none rounded-lg border border-cf-border bg-cf-surface pr-7 pl-2.5 text-xs font-semibold text-cf-text-muted outline-none transition hover:bg-cf-surface-soft focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/10 cursor-pointer"
                >
                  {sortOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-cf-text-subtle/80" />
              </div>
            </div>
          </>
        ) : sortLabel ? (
          <span className="rounded-lg border border-cf-border bg-cf-surface px-2 py-1 text-xs font-semibold text-cf-text-muted">
            Sort: {sortLabel}
          </span>
        ) : null}
        {children ? (
          <>
            {filterOptions.length || hasInteractiveSort ? (
              <span className="mx-1 h-4 w-px bg-cf-border" />
            ) : null}
            {children}
          </>
        ) : null}
      </div>

      {savingLabel ? <Badge variant="muted">{savingLabel}</Badge> : null}
      {actions}
    </>
  );

  if (toolbarSlot) {
    return createPortal(content, toolbarSlot);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-cf-surface px-3 py-3">
      {content}
    </div>
  );
}

export function AdminTableFooter({
  shown,
  total,
  label = "items",
}: {
  shown: number;
  total: number;
  label?: string;
}) {
  return (
    <div className="border-t border-cf-border bg-cf-surface-soft/40 px-3 py-3 text-xs text-cf-text-muted">
      Showing {shown} of {total} {label}
    </div>
  );
}

/* Table-body row shown when a list fails to load */
export function AdminTableLoadError({
  colSpan,
  message,
  onRetry,
}: {
  colSpan: number;
  message: string;
  onRetry: () => void;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-12 text-center">
        <p className="text-sm text-cf-text-muted">{message}</p>
        <Button type="button" size="sm" className="mt-3" onClick={onRetry}>
          Retry
        </Button>
      </td>
    </tr>
  );
}

/* Inline notice banner */
export function AdminInlineNotice({
  tone = "warning",
  children,
}: {
  tone?: Exclude<AdminConfirmVariant, "default">;
  children: ReactNode;
}) {
  const toneClasses = {
    warning: "border-cf-warning-text bg-cf-warning-bg text-cf-warning-text",
    danger: "border-cf-danger-text bg-cf-danger-bg text-cf-danger-text",
  };

  return (
    <div
      className={[
        "rounded-2xl border px-4 py-3 text-sm mx-3 mt-4",
        toneClasses[tone] ?? toneClasses.warning,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
